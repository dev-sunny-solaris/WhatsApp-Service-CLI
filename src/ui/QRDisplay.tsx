import { Box, Text } from 'ink'
import qrcode from 'qrcode'

export async function generateQRText(data: string): Promise<string> {
  return qrcode.toString(data, { type: 'terminal', small: true, margin: 1 })
}

interface Props {
  qr: string
  status?: string
}

export default function QRDisplay({ qr, status }: Props) {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text>{qr}</Text>
      {status && <Text color="cyan">Status: {status}</Text>}
      <Text dimColor>Scan with WhatsApp  ·  Esc to cancel</Text>
    </Box>
  )
}
