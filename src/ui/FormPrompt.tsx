import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'
import type { FieldDef, FormFieldsFn, FormValues } from '../commands/registry.js'
import { colors } from './theme.js'

interface Props {
	title: string
	fields: FormFieldsFn
	initial: FormValues
	onSubmit: (values: FormValues) => void
	onCancel: () => void
}

/**
 * Full-screen form prompt. Renders all fields at once; user navigates with Tab/↑↓.
 * Resolves dynamic field lists by calling `fields(currentValues)` on every render.
 */
export default function FormPrompt({ title, fields, initial, onSubmit, onCancel }: Props) {
	const [values, setValues] = useState<FormValues>(initial)
	const [focusIndex, setFocusIndex] = useState(0)
	const [cursors, setCursors] = useState<Record<string, number>>(() => {
		const m: Record<string, number> = {}
		for (const [k, v] of Object.entries(initial)) m[k] = v.length
		return m
	})

	const resolvedFields = useMemo(
		() => (typeof fields === 'function' ? fields(values) : fields),
		[fields, values],
	)

	const safeIndex = Math.min(focusIndex, Math.max(0, resolvedFields.length - 1))
	const activeField = resolvedFields[safeIndex]

	const goNext = () => setFocusIndex((i) => Math.min(i + 1, resolvedFields.length - 1))
	const goPrev = () => setFocusIndex((i) => Math.max(i - 1, 0))

	const getCursor = (key: string) => cursors[key] ?? (values[key]?.length ?? 0)
	const setCursor = (key: string, pos: number) =>
		setCursors((prev) => ({ ...prev, [key]: pos }))

	const trySubmit = () => {
		for (let i = 0; i < resolvedFields.length; i++) {
			const f = resolvedFields[i]
			if (!f.optional && !values[f.key]) {
				setFocusIndex(i)
				return
			}
		}
		const result: FormValues = {}
		for (const f of resolvedFields) result[f.key] = values[f.key] ?? ''
		onSubmit(result)
	}

	useInput((input, key) => {
		if (!activeField) return
		if (key.escape) { onCancel(); return }

		if (key.tab && key.shift) { goPrev(); return }
		if (key.tab) { goNext(); return }

		if (activeField.type === 'select') {
			const opts = activeField.options ?? []
			const curIdx = Math.max(0, opts.findIndex((o) => o.value === values[activeField.key]))
			if (key.upArrow) {
				const prev = (curIdx - 1 + opts.length) % opts.length
				setValues((v) => ({ ...v, [activeField.key]: opts[prev].value }))
				return
			}
			if (key.downArrow) {
				const next = (curIdx + 1) % opts.length
				setValues((v) => ({ ...v, [activeField.key]: opts[next].value }))
				return
			}
			if (key.return) {
				if (safeIndex === resolvedFields.length - 1) trySubmit()
				else goNext()
				return
			}
			return
		}

		// Text field
		const k = activeField.key
		const val = values[k] ?? ''
		const cur = getCursor(k)

		if (key.upArrow) { goPrev(); return }
		if (key.downArrow) { goNext(); return }
		if (key.return) {
			if (safeIndex === resolvedFields.length - 1) trySubmit()
			else goNext()
			return
		}
		if (key.leftArrow) { setCursor(k, Math.max(0, cur - 1)); return }
		if (key.rightArrow) { setCursor(k, Math.min(val.length, cur + 1)); return }
		if (key.ctrl && input === 'a') { setCursor(k, 0); return }
		if (key.ctrl && input === 'e') { setCursor(k, val.length); return }
		if (key.ctrl && input === 'u') {
			setValues((v) => ({ ...v, [k]: '' }))
			setCursor(k, 0)
			return
		}
		if (key.backspace || key.delete) {
			if (cur === 0) return
			setValues((v) => ({ ...v, [k]: val.slice(0, cur - 1) + val.slice(cur) }))
			setCursor(k, cur - 1)
			return
		}
		if (input && !key.ctrl && !key.meta) {
			setValues((v) => ({ ...v, [k]: val.slice(0, cur) + input + val.slice(cur) }))
			setCursor(k, cur + input.length)
		}
	})

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={colors.highlight}
			marginX={2}
			paddingX={1}
		>
			<Text bold color={colors.highlight}>{title}</Text>
			<Text> </Text>
			{resolvedFields.map((field, i) => {
				const isActive = i === safeIndex
				const value = values[field.key] ?? ''
				return (
					<Box
						key={field.key}
						flexDirection="column"
						marginBottom={i < resolvedFields.length - 1 ? 1 : 0}
					>
						<Text color={isActive ? colors.prompt : colors.muted}>
							{field.label}{field.optional ? ' (optional)' : ''}
						</Text>
						{field.type === 'select'
							? <SelectFieldRow field={field} value={value} isActive={isActive} />
							: <TextFieldRow
								value={value}
								cursor={getCursor(field.key)}
								isActive={isActive}
								placeholder={field.placeholder}
							/>
						}
					</Box>
				)
			})}
			<Text> </Text>
			<Text color={colors.muted}>Tab / ↑↓ navigate   Enter submit   Esc cancel</Text>
		</Box>
	)
}

interface TextFieldRowProps {
	value: string
	cursor: number
	isActive: boolean
	placeholder?: string
}

function TextFieldRow({ value, cursor, isActive, placeholder }: TextFieldRowProps) {
	if (!isActive) {
		return (
			<Box borderStyle="single" borderColor={colors.muted} paddingX={1}>
				<Text color={value ? colors.highlight : colors.muted}>{value || placeholder || ''}</Text>
			</Box>
		)
	}
	const before = value.slice(0, cursor)
	const atCursor = value[cursor] ?? ' '
	const after = value.slice(cursor + 1)
	return (
		<Box borderStyle="single" borderColor={colors.prompt} paddingX={1}>
			<Text>{before}</Text>
			<Text inverse>{atCursor}</Text>
			<Text>{after}</Text>
		</Box>
	)
}

interface SelectFieldRowProps {
	field: FieldDef
	value: string
	isActive: boolean
}

function SelectFieldRow({ field, value, isActive }: SelectFieldRowProps) {
	const opts = field.options ?? []
	const label = opts.find((o) => o.value === value)?.label ?? value
	return (
		<Box borderStyle="single" borderColor={isActive ? colors.prompt : colors.muted} paddingX={1}>
			{isActive && <Text color={colors.muted}>↑↓  </Text>}
			<Text color={isActive ? colors.highlight : colors.muted}>{label}</Text>
		</Box>
	)
}
