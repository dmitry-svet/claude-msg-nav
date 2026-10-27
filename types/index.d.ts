export type MsgEntry = { id: string; preview: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'msg-nav': {
      list: Shaped<MsgEntry[]>
      cursor: number | null
      isHidden: boolean
      isExpanded: boolean
    }
  }
}
