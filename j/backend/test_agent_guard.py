"""Offline regression test for the hallucinated-confirmation guard.

No network and no DeepSeek key required: chat_fn is a scripted fake that replays
the exact failure seen in testing (the model replies "已经帮你记下了" without
ever emitting a tool_call).

Run: python3 test_agent_guard.py
"""

from __future__ import annotations

from typing import Any

from assistant_agent import run_agent_turn


def text_response(content: str) -> dict[str, Any]:
    return {"choices": [{"message": {"role": "assistant", "content": content}}]}


def tool_response(name: str, arguments: str) -> dict[str, Any]:
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {"id": "call_1", "type": "function",
                         "function": {"name": name, "arguments": arguments}}
                    ],
                }
            }
        ]
    }


class ScriptedChat:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = responses
        self.calls: list[dict[str, Any]] = []

    def __call__(self, payload: dict[str, Any]) -> dict[str, Any]:
        # run_agent_turn mutates one messages list in place, so snapshot it.
        self.calls.append({**payload, "messages": list(payload["messages"])})
        if not self.responses:
            raise AssertionError("chat_fn called more times than scripted")
        return self.responses.pop(0)


def saving_dispatch(name: str, args: dict[str, Any]) -> tuple[Any, list[str]]:
    if name == "set_availability":
        return {"applied": True, "reply": "已记录", "weeklyAvailability": {}}, ["availability"]
    return {"error": f"unknown tool: {name}"}, []


def test_guard_recovers_by_forcing_the_tool_call() -> None:
    """Claim with no tool call -> nudge -> model calls the tool -> real save."""
    chat = ScriptedChat(
        [
            text_response("收到！我把你的空闲时间记下来了：每天下午2点到晚上9点。"),
            tool_response("set_availability", '{"description": "每天下午两点到晚上九点有空"}'),
            text_response("已经帮你保存了：每天下午2点到晚上9点 ✅"),
        ]
    )
    result = run_agent_turn(
        chat, "deepseek-chat", [], "我每天下午两点到晚上九点有空", saving_dispatch
    )

    assert result["stateChanged"]["availability"] is True, result
    assert result["unverifiedClaim"] is False, result
    assert [t["name"] for t in result["toolTrace"]] == ["set_availability"], result
    assert "系统提示" not in result["reply"], result

    # The nudge must be sent, and tools must still be attached on the retry so
    # the model is actually able to call one.
    assert len(chat.calls) == 3
    nudge = chat.calls[1]["messages"][-1]
    assert nudge["role"] == "user" and "[系统校验]" in nudge["content"]
    assert chat.calls[1].get("tools"), "retry round must still expose the tools"


def test_guard_flags_the_reply_when_the_model_keeps_faking_it() -> None:
    """If the model claims a save twice, the user must be told it did not happen."""
    chat = ScriptedChat(
        [
            text_response("收到！我把你的空闲时间记下来了。"),
            text_response("你说得对，我这边其实已经帮你记录好了 ✅"),
        ]
    )
    result = run_agent_turn(
        chat, "deepseek-chat", [], "我每天下午两点到晚上九点有空", saving_dispatch
    )

    assert result["stateChanged"]["availability"] is False, result
    assert result["unverifiedClaim"] is True, result
    assert result["toolTrace"] == [], result
    assert "并没有真正写入" in result["reply"], result


def test_guard_stays_quiet_on_read_only_answers() -> None:
    """A get_plan answer that happens to say 安排好了 must not be flagged."""

    def read_dispatch(name: str, args: dict[str, Any]) -> tuple[Any, list[str]]:
        return {"date": "2026-08-29", "plan": {"items": []}}, []

    chat = ScriptedChat(
        [
            tool_response("get_plan", '{"date": "2026-08-29"}'),
            text_response("你明天的计划已经安排好了，一共 3 段。"),
        ]
    )
    result = run_agent_turn(chat, "deepseek-chat", [], "看看我明天的计划", read_dispatch)

    assert result["toolTrace"][0]["name"] == "get_plan", result
    assert result["unverifiedClaim"] is False, result
    assert "系统提示" not in result["reply"], result
    # No wasted extra round: the guard must not fire on a read-only answer.
    assert len(chat.calls) == 2, chat.calls


if __name__ == "__main__":
    test_guard_recovers_by_forcing_the_tool_call()
    test_guard_flags_the_reply_when_the_model_keeps_faking_it()
    test_guard_stays_quiet_on_read_only_answers()
    print("All agent guard tests passed.")
