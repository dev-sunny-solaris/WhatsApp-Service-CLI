import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { getMe } from '../api/device.js'
import { dispatch, matchCommands, type CommandDef, type FormFieldsFn, type FormValues, type OutputLine } from '../commands/registry.js'
import { getRole } from '../state/session.js'
import ChatHistory from './ChatHistory.js'
import WelcomeBanner from './WelcomeBanner.js'
import CommandDropdown from './CommandDropdown.js'
import { filterCommands, nextIndex, prevIndex } from './CommandDropdown.js'
import FormPrompt from './FormPrompt.js'
import InputBar from './InputBar.js'
import SelectPrompt from './SelectPrompt.js'
import { nextSelectIndex, prevSelectIndex, type SelectItem } from './selectHelpers.js'
import StatusBar, { type StatusInfo } from './StatusBar.js'
import { colors, symbols } from './theme.js'

const PAGE_SIZE = 5

interface SelectMode {
  items: SelectItem[]
  prompt?: string
  onSelect: (value: string) => void
  onCancel: () => void
}

interface FormMode {
  title: string
  fields: FormFieldsFn
  initial: FormValues
  onSubmit: (values: FormValues) => void
  onCancel: () => void
}

export default function App() {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const cancelRef = useRef<(() => void) | null>(null)
  const messagesRef = useRef<OutputLine[]>([])
  const inputModeRef = useRef<((v: string | undefined) => void) | null>(null)
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
  const [inputModePrompt, setInputModePrompt] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
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

  const showInput = useCallback((prompt: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
      setInputModePrompt(prompt)
      inputModeRef.current = resolve
    })
  }, [])

  const showForm = useCallback(
    (title: string, fields: FormFieldsFn, initial?: Partial<FormValues>): Promise<FormValues | undefined> =>
      new Promise((resolve) => {
        const initValues: FormValues = { ...(initial ?? {}) }
        const seedFields = typeof fields === 'function' ? fields(initValues) : fields
        for (const f of seedFields) {
          if (f.type === 'select' && f.options?.length && !initValues[f.key]) {
            initValues[f.key] = f.options[0].value
          }
        }
        setFormMode({
          title,
          fields,
          initial: initValues,
          onSubmit: (values) => { setFormMode(null); resolve(values) },
          onCancel: () => { setFormMode(null); resolve(undefined) },
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
    async (rawInput: string) => {
      // Route to pending text input prompt if one is active
      if (inputModeRef.current) {
        const resolver = inputModeRef.current
        inputModeRef.current = null
        setInputModePrompt(null)
        writeLine({ text: rawInput, type: 'raw' })
        setScrollOffset(0)
        resolver(rawInput || undefined)
        return
      }

      if (rawInput.trim()) {
        setCommandHistory((prev) => [...prev, rawInput.trim()])
        setHistoryIndex(-1)
      }
      setScrollOffset(0)

      const role = getRole()
      const found = await dispatch(rawInput, role, {
        write,
        writeLine,
        setView: setActiveView,
        showSelect,
        showInput,
        showForm,
        clear: () => setMessages([]),
        exit,
        setCancel: (fn) => { cancelRef.current = fn },
      })

      if (!found) {
        write(`Unknown command: ${rawInput}`, 'error')
      }

      void refreshStatus()
    },
    [write, writeLine, showSelect, showInput, showForm, refreshStatus, exit],
  )

  useInput((_input, key) => {
    if (formMode) return

    if (key.escape) {
      // Cancel active view (QR, spinner, etc.)
      if (activeView) {
        cancelRef.current?.()
        cancelRef.current = null
        setActiveView(null)
        return
      }
      // Cancel pending text input prompt
      if (inputModeRef.current) {
        const resolver = inputModeRef.current
        inputModeRef.current = null
        setInputModePrompt(null)
        resolver(undefined)
        return
      }
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
        {messages.length === 0
          ? <WelcomeBanner />
          : <ChatHistory messages={messages} scrollOffset={scrollOffset} maxRows={visibleRows} />
        }
      </Box>

      {formMode ? (
        <FormPrompt
          title={formMode.title}
          fields={formMode.fields}
          initial={formMode.initial}
          onSubmit={formMode.onSubmit}
          onCancel={formMode.onCancel}
        />
      ) : selectMode ? (
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
          {inputModePrompt && (
            <Box paddingLeft={2}>
              <Text color={colors.prompt}>{symbols.arrow} {inputModePrompt}</Text>
            </Box>
          )}
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
