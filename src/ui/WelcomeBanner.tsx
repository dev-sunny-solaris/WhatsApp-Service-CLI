import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { VERSION } from '../version.js'
import { colors } from './theme.js'

const LOGO_ROWS: string[] = [
	' ██████╗  ██████╗ ██╗      █████╗ ██████╗ ██╗███████╗',
	'██╔════╝ ██╔═══██╗██║     ██╔══██╗██╔══██╗██║██╔════╝',
	'╚█████╗  ██║   ██║██║     ███████║██████╔╝██║███████╗',
	' ╚═══██╗ ██║   ██║██║     ██╔══██║██╔══██╗██║╚════██║',
	'██████╔╝ ╚██████╔╝███████╗██║  ██║██║  ██║██║███████║',
	'╚═════╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝',
]

const LOGO_COLORS: string[] = [
	'#ff8500',
	'#cc8133',
	'#997d66',
	'#667999',
	'#3375cc',
	'#0072ff',
]

/**
 * @returns {ReactElement}
 */
export default function WelcomeBanner(): ReactElement {
	return (
		<Box flexDirection="column" paddingLeft={2} paddingBottom={1}>
			{LOGO_ROWS.map((row, i) => (
				<Text key={i} color={LOGO_COLORS[i]}>{row}</Text>
			))}
			<Box flexDirection="column" paddingTop={1}>
				<Text>
					<Text color={colors.highlight}>Solaris</Text>
					<Text color={colors.muted}>{'  ·  '}</Text>
					<Text color={colors.highlight}>WhatsApp Service CLI</Text>
					<Text color={colors.muted}>{'  ·  '}</Text>
					<Text color="#ff8500">{'v' + VERSION}</Text>
				</Text>
				<Text color={colors.muted}>/login to connect  ·  / to browse commands  ·  /help for docs</Text>
			</Box>
		</Box>
	)
}
