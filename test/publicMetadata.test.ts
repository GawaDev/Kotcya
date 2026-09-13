import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const canonicalUrl = 'https://kotcya.onrender.com/'

describe('公開メタデータ', () => {
  it('製品名、バージョン、ライセンス、リポジトリを一致させる', () => {
    expect(packageJson.name).toBe('kotcya')
    expect(packageJson.version).toBe('0.1.0')
    expect(read('VERSION').trim()).toBe(packageJson.version)
    expect(packageJson.license).toBe('MIT')
    expect(packageJson.repository.url).toBe('git+https://github.com/GawaDev/Kotcya.git')
    expect(packageJson.homepage).toBe(canonicalUrl.replace(/\/$/, ''))
  })

  it('HTMLに正規URLと共有用メタデータを設定する', () => {
    const document = new DOMParser().parseFromString(read('index.html'), 'text/html')

    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.png')
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest')
    expect(document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(canonicalUrl)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy()
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(canonicalUrl)
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(`${canonicalUrl}og.png`)
  })

  it('検索エンジン向けファイルに正規URLを使用する', () => {
    expect(read('public/robots.txt')).toContain(`${canonicalUrl}sitemap.xml`)
    expect(read('public/sitemap.xml')).toContain(`<loc>${canonicalUrl}</loc>`)
    expect(read('public/llms.txt')).toContain(`Canonical application: ${canonicalUrl}`)
  })

  it('RenderをWeb Serviceとして構成する', () => {
    const blueprint = read('render.yaml')
    expect(blueprint).toContain('runtime: node')
    expect(blueprint).toContain('healthCheckPath: /health')
    expect(read('server.mjs')).toContain("url.pathname === '/health'")
  })
})
