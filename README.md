# msg-nav

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install msg-nav --marketplace dmitry-svet/claude-msg-nav
```

Answer `y` to add the marketplace, then pick a scope (user is the usual one). From a shell: `claude plugin install msg-nav --marketplace dmitry-svet/claude-msg-nav`. In the desktop app: click `+` next to the prompt box, Plugins, Add marketplace with `dmitry-svet/claude-msg-nav`, then Add plugin.

A band above the prompt for jumping between the assistant's text messages (the white-dot rows) in the Claude Code terminal transcript. Tool calls, command output and notices are skipped.

The band shows `◀ ▶ 3/12 [Read] <first line of the message>` and a `×` that hides it. Clicking an arrow scrolls the transcript to that message. Clicks need the fullscreen renderer (`/tui fullscreen`); the classic renderer, the desktop app and the VS Code extension refuse transcript scrolling from a plugin (VS Code answers `non scrollable`, verified 2026-10-27), so in the app and VS Code a jump expands the band to the full text of the message instead, drawn as markdown. `[Read]` expands it on any surface, `[Collapse]` folds it back to the one-line preview.

Commands: `/msg-prev`, `/msg-next` (jump), `/msg-nav` (show or hide the band). Bind the jumps to keys in `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    { "context": "Chat", "bindings": { "ctrl+up": "command:msg-prev", "ctrl+down": "command:msg-next" } }
  ]
}
```

Only messages written after the mod loaded are listed; the list lives in the session state and survives a reload of the mod.
