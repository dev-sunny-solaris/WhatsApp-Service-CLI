import { Box, useApp, useInput, useStdout } from 'ink'
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { getMe } from '../api/device.js'
import { dispatch, matchCommands, type CommandDef, type OutputLine } from '../commands/registry.js'
import { getRole } from '../state/session.js'
import ChatHistory from './ChatHistory.js'
import CommandDropdown from './CommandDropdown.js'
import { filterCommands, nextIndex, prevIndex } from './CommandDropdown.js'
import InputBar from './InputBar.js'
import SelectPrompt from './SelectPrompt.js'
import { nextSelectIndex, prevSelectIndex, type SelectItem } from './selectHelpers.js'
import StatusBar, { type StatusInfo } from './StatusBar.js'

const PAGE_SIZE = 5

interface SelectMode {
  items: SelectItem[]
  prompt?: string
  onSelect: (value: string) => void
  onCancel: () => void
}

export default function App() {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const cancelRef = useRef<(() => void) | null>(null)
  const messagesRef = useRef<OutputLine[]>([])
  const [messages, setMessages] = useState<OutputLine[]>([])
  const [activeView, setActiveView] = useState<ReactElement | null>(null)
  const [input, setInput] = useState({ value: '', cursor: 0 })
  const [scrollOffset, setScrollOffset] = useState(0)
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownCommands, setDropdownCommands] = useState<CommandDef[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectMode, setSelectMode] = useState<SelectMode | null>(null)
  const [selectIndex, setSelectIndex] = useState(0)
  const selectIndexRef = useRef(0)

  // Keep ref in sync so useInput can read current messages.length without stale closure
  messagesRef.current = messages

  const write = useCallback((text: string, type: OutputLine['type'] = 'info') => {
    setMessages((prev) => [...prev, { text, type }])
  }, [])

  const writeLine = useCallback((line: OutputLine) => {
    setMessages((prev) => [...prev, line])
  }, [])

  const showSelect = useCallback(
    (options: { prompt?: string; items: SelectItem[] }): Promise<string | undefined> =>
      new Promise((resolve) => {
        selectIndexRef.current = 0
        setSelectIndex(0)
        setSelectMode({
          ...options,
          onSelect: (value) => {
            setSelectMode(null)
            selectIndexRef.current = 0
            setSelectIndex(0)
            resolve(value)
          },
          onCancel: () => {
            setSelectMode(null)
            selectIndexRef.current = 0
            setSelectIndex(0)
            resolve(undefined)
          },
        })
      }),
    [],
  )

  const refreshStatus = useCallback(async () => {
    if (getRole() !== 'client') {
      setStatus(null)
      return
    }
    try {
      const info = await getMe()
      setStatus({
        connected: info.is_connected,
        phone: info.phone_number,
        dailyUsed: info.daily_used,
        dailyLimit: info.quota?.daily_limit ?? null,
      })
    } catch {
      // keep stale status on error
    }
  }, [])

  useEffect(() => { void refreshStatus() }, [refreshStatus])

  const handleValueChange = useCallback((value: string, cursor: number) => {
    setInput({ value, cursor })
    setHistoryIndex(-1)
  }, [])

  const handleDropdownQuery = useCallback((query: string) => {
    const role = getRole()
    const all = matchCommands('', role)
    const filtered = filterCommands(all, query)
    setDropdownCommands(filtered)
    setSelectedIndex(0)
    setDropdownOpen(filtered.length > 0 || query === '')
  }, [])

  const handleDropdownClose = useCallback(() => {
    setDropdownOpen(false)
    setSelectedIndex(0)
  }, [])

  const handleSubmit = useCallback(
    async (input: string) => {
      if (input.trim()) {
        setCommandHistory((prev) => [...prev, input.trim()])
        setHistoryIndex(-1)
      }
      writeLine({ text: input, type: 'raw' })
      setScrollOffset(0)

      const role = getRole()
      const found = await dispatch(input, role, {
        write,
        writeLine,
        setView: setActiveView,
        showSelect,
        clear: () => setMessages([]),
        exit,
        setCancel: (fn) => { cancelRef.current = fn },
      })

      if (!found) {
        write(`Unknown command: ${input}`, 'error')
      }

      void refreshStatus()
    },
    [write, writeLine, showSelect, refreshStatus, exit],
  )

  useInput((_input, key) => {
    // ESC while active view (e.g. QR) is showing → cancel command
    if (key.escape && activeView) {
      cancelRef.current?.()
      cancelRef.current = null
      setActiveView(null)
      return
    }

    // Scroll chat history
    if (key.pageUp) {
      setScrollOffset((o) => Math.min(o + PAGE_SIZE, Math.max(0, messagesRef.current.length - 1)))
      return
    }
    if (key.pageDown) {
      setScrollOffset((o) => Math.max(0, o - PAGE_SIZE))
      return
    }

    if (selectMode) {
      if (key.upArrow) {
        const next = prevSelectIndex(selectIndexRef.current, selectMode.items.length)
        selectIndexRef.current = next
        setSelectIndex(next)
      } else if (key.downArrow) {
        const next = nextSelectIndex(selectIndexRef.current, selectMode.items.length)
        selectIndexRef.current = next
        setSelectIndex(next)
      } else if (key.return || key.tab) {
        selectMode.onSelect(selectMode.items[selectIndexRef.current].value)
      } else if (key.escape) {
        selectMode.onCancel()
      }
      return
    }

    if (dropdownOpen) {
      if (key.upArrow) {
        setSelectedIndex((i) => prevIndex(i, dropdownCommands.length))
      } else if (key.downArrow) {
        setSelectedIndex((i) => nextIndex(i, dropdownCommands.length))
      } else if (key.tab || key.return) {
        const selected = dropdownCommands[selectedIndex]
        if (selected) {
          const filled = `/${selected.name} `
          setInput({ value: filled, cursor: filled.length })
          handleDropdownClose()
        }
      }
      return
    }

    // Command history navigation (when no dropdown)
    if (key.upArrow && commandHistory.length > 0) {
      const newIdx = historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1)
      const cmd = commandHistory[newIdx]
      setHistoryIndex(newIdx)
      setInput({ value: cmd, cursor: cmd.length })
    } else if (key.downArrow && historyIndex !== -1) {
      const newIdx = historyIndex + 1
      if (newIdx >= commandHistory.length) {
        setHistoryIndex(-1)
        setInput({ value: '', cursor: 0 })
      } else {
        const cmd = commandHistory[newIdx]
        setHistoryIndex(newIdx)
        setInput({ value: cmd, cursor: cmd.length })
      }
    }
  })

  const role = getRole()
  // Available rows for chat: total - status bar (1) - input bar border+content (3)
  const visibleRows = Math.max(5, stdout.rows - 4)

  return (
    <Box flexDirection="column" height={stdout.rows}>
      <Box flexGrow={1} flexDirection="column" justifyContent="flex-end" overflow="hidden">
        <ChatHistory messages={messages} scrollOffset={scrollOffset} maxRows={visibleRows} />
      </Box>

      {selectMode ? (
        <SelectPrompt
          items={selectMode.items}
          selectedIndex={selectIndex}
          onSelect={selectMode.onSelect}
          onCancel={selectMode.onCancel}
          prompt={selectMode.prompt}
        />
      ) : (
        <>
          {activeView ? (
            <Box>{activeView}</Box>
          ) : dropdownOpen ? (
            <CommandDropdown commands={dropdownCommands} selectedIndex={selectedIndex} />
          ) : null}
          <InputBar
            value={input.value}
            cursor={input.cursor}
            onValueChange={handleValueChange}
            role={role}
            onSubmit={handleSubmit}
            onDropdownQuery={handleDropdownQuery}
            onDropdownClose={handleDropdownClose}
            dropdownOpen={dropdownOpen}
          />
        </>
      )}

      <StatusBar status={status} role={role} />
    </Box>
  )
}
