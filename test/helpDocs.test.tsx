import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HelpModal } from '../src/HelpModal'
import { getHelpMarkdown, helpDocs } from '../src/helpDocs'
import { theme } from '../src/theme'

const expectedHelpDocIds = [
  'manual/01-intro.md',
  'manual/02-ui-and-files.md',
  'manual/03-editing.md',
  'manual/04-information-and-provenance.md',
  'manual/05-saving.md',
  'manual/06-troubleshooting.md',
  'manual/07-about.md',
  'spec/input-output.md',
  'spec/image-processing.md',
  'spec/security-privacy.md',
  'spec/conformance.md',
  'license/01-mit.md',
  'license/02-third-party.md',
]

const bundledMarkdown = import.meta.glob('../docs/{manual,spec,license}/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('画面ヘルプのカタログ', () => {
  it('利用者向け文書を過不足なく一度ずつ掲載する', () => {
    const ids = helpDocs.map(({ id }) => id)
    const userFacingDocIds = Object.keys(bundledMarkdown)
      .map((path) => path.replace('../docs/', ''))
      .filter((id) => id !== 'spec/architecture.md')

    expect(ids).toEqual(expectedHelpDocIds)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(userFacingDocIds.sort())
  })

  it.each(expectedHelpDocIds)('%s のMarkdownを同梱する', (id) => {
    expect(getHelpMarkdown(id)).toMatch(/^#\s+\S/m)
  })

  it('最初の文書とバージョンを画面に表示する', () => {
    render(
      <MantineProvider theme={theme}>
        <HelpModal opened onClose={vi.fn()} />
      </MantineProvider>,
    )

    expect(screen.getByRole('heading', { name: 'はじめに' })).toBeInTheDocument()
    expect(screen.getByText(/Kotcya 0\.1\.0/)).toBeInTheDocument()
  })
})
