import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MsgEntry } from '../types'

// Assistant text messages of the main conversation, in transcript order.
const list = atom({ plugin: 'msg-nav', key: 'list' } as const, [] as MsgEntry[], {
  shape: 'list-2',
})
// Index into `list` the band points at; null follows the newest message.
const cursor = atom({ plugin: 'msg-nav', key: 'cursor' } as const, null as number | null)
const isHidden = atom({ plugin: 'msg-nav', key: 'isHidden' } as const, false)
// The full text of the message under the cursor is drawn in the band while true.
const isExpanded = atom({ plugin: 'msg-nav', key: 'isExpanded' } as const, false)

const PREVIEW_MAX = 200
const TEXT_MAX = 20000

function previewOf(text: string): string {
  const line = text
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0 && !/^```/.test(l))
  if (!line) return ''
  return line
    .replace(/^#+\s*/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/[`*_]/g, '')
    .slice(0, PREVIEW_MAX)
}

async function hasAppSurface($: EngineInterface): Promise<boolean> {
  return (await $.session.surfaces()).some(s => s !== 'terminal')
}

async function jump($: EngineInterface, delta: number): Promise<string> {
  const l = await read($, list)
  if (l.length === 0) return 'No assistant messages yet.'
  const cur = await read($, cursor)
  const from = cur ?? l.length - 1
  const to = Math.min(l.length - 1, Math.max(0, from + delta))
  const target = l[to]
  if (!target) return 'No assistant messages yet.'
  await update($, cursor, () => (to === l.length - 1 ? null : to))
  // The app and VS Code refuse transcript scrolling from a plugin: the band
  // shows the message instead.
  if (await hasAppSurface($)) {
    await update($, isExpanded, () => true)
    return `Message ${to + 1}/${l.length}`
  }
  const r = await $.ui.scroll({ to: { requestId: target.id }, block: 'start' })
  if (r.deny) {
    $.ui.toast(`msg-nav: ${r.deny}`)
    return `Cannot scroll: ${r.deny}`
  }
  return `Message ${to + 1}/${l.length}`
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'msg-prev',
      description: 'Jump to the previous assistant message',
    })
    await $.command.register({
      name: 'msg-next',
      description: 'Jump to the next assistant message',
    })
    await $.command.register({
      name: 'msg-nav',
      description: 'Show or hide the message navigation band',
    })

    return next(e)
  })

  // Collect every assistant row of the main conversation that has text.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    if (e.agentId || e.message.type !== 'assistant') return next(e)
    const text = e.message.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()
    if (text.length === 0) return next(e)

    const entry: MsgEntry = { id: e.uuid, preview: previewOf(text), text: text.slice(0, TEXT_MAX) }
    await update($, list, l => (l.some(x => x.id === entry.id) ? l : [...l, entry].slice(-2000)))

    return next(e)
  })

  on('command.run', { command: 'msg-prev' }, async $ => ({ text: await jump($, -1) }))
  on('command.run', { command: 'msg-next' }, async $ => ({ text: await jump($, 1) }))
  on('command.run', { command: 'msg-nav' }, async $ => {
    const hidden = await read($, isHidden)
    await update($, isHidden, () => !hidden)
    return { text: hidden ? 'msg-nav band shown.' : 'msg-nav band hidden. /msg-nav shows it again.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const l = await read($, list)
    if (e.props.hasSurvey || l.length === 0 || (await read($, isHidden))) {
      return next(e)
    }
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const cur = (await read($, cursor)) ?? l.length - 1
    const entry = l[cur] ?? { id: '', preview: '', text: '' }
    const expanded = await read($, isExpanded)
    const counter = `${cur + 1}/${l.length}`
    const toggle = expanded ? '[Collapse]' : '[Read]'
    // "[◀] [▶] " + counter + "  " + toggle + " " + preview + " [×]"
    const room = Math.max(10, e.props.bodyColumns - 8 - counter.length - 2 - toggle.length - 1 - 4)
    const preview = entry.preview.length > room ? entry.preview.slice(0, room - 1) + '…' : entry.preview

    return (
      <Box flexDirection="column">
        {expanded && <Markdown text={entry.text} />}
        <Box>
          <Button key="prev" label="◀" plain onPress={() => jump($, -1)} />
          <Text> </Text>
          <Button key="next" label="▶" plain onPress={() => jump($, 1)} />
          <Text dimColor> {counter}  </Text>
          <Button key="toggle" label={toggle} plain dimColor onPress={() => update($, isExpanded, v => !v)} />
          <Text> </Text>
          {!expanded && <Text wrap="truncate-end">{preview}</Text>}
          <Text> </Text>
          <Button key="hide" label="×" plain dimColor onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
