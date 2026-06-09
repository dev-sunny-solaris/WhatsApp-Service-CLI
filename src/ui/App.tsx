import { Box, useApp, useInput } from 'ink'
import { useCallback, useRef, useState, type ReactElement } from 'react'
import { dispatch, matchCommands, type CommandDef, type OutputLine } from '../commands/registry.js'
import { getRole } from '../state/session.js'
import ChatHistory from './ChatHistory.js'
import CommandDropdown from './CommandDropdown.js'
import { filterCommands, nextIndex, prevIndex } from './CommandDropdown.js'
import InputBar from './InputBar.js'
import SelectPrompt from './SelectPrompt.js'
import { nextSelectIndex, prevSelectIndex, type SelectItem } from './selectHelpers.js'

interface SelectMode {
  items: SelectItem[]
  prompt?: string
  onSelect: (value: string) => void
  onCancel: () => void
}

export default function App() {
  const { exit } = useApp()
  const [messages, setMessages] = useState<OutputLine[]>([])
  const [activeView, setActiveView] = useState<ReactElement | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputCursor, setInputCursor] = useState(0)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownCommands, setDropdownCommands] = useState<CommandDef[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectMode, setSelectMode] = useState<SelectMode | null>(null)
  const [selectIndex, setSelectIndex] = useState(0)
  const selectIndexRef = useRef(0)

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

  const handleValueChange = useCallback((value: string, cursor: number) => {
    setInputValue(value)
    setInputCursor(cursor)
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

      const role = getRole()
      const found = await dispatch(input, role, {
        write,
        writeLine,
        setView: setActiveView,
        showSelect,
        clear: () => setMessages([]),
        exit,
      })

      if (!found) {
        write(`Unknown command: ${input}`, 'error')
      }
    },
    [write, writeLine, showSelect, exit],
  )

  useInput((_input, key) => {
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
          setInputValue(filled)
          setInputCursor(filled.length)
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
      setHistoryIndex(newIdx)
      const cmd = commandHistory[newIdx]
      setInputValue(cmd)
      setInputCursor(cmd.length)
    } else if (key.downArrow && historyIndex !== -1) {
      const newIdx = historyIndex + 1
      if (newIdx >= commandHistory.length) {
        setHistoryIndex(-1)
        setInputValue('')
        setInputCursor(0)
      } else {
        setHistoryIndex(newIdx)
        const cmd = commandHistory[newIdx]
        setInputValue(cmd)
        setInputCursor(cmd.length)
      }
    }
  })

  const role = getRole()

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column" justifyContent="flex-end">
        <ChatHistory messages={messages} />
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
            value={inputValue}
            cursor={inputCursor}
            onValueChange={handleValueChange}
            role={role}
            onSubmit={handleSubmit}
            onDropdownQuery={handleDropdownQuery}
            onDropdownClose={handleDropdownClose}
            dropdownOpen={dropdownOpen}
          />
        </>
      )}
    </Box>
  )
}
