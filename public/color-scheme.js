try {
  const stored = localStorage.getItem('mantine-color-scheme-value');
  const preference = stored === 'light' || stored === 'dark' ? stored : 'auto';
  const scheme = preference === 'auto'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  document.documentElement.setAttribute('data-mantine-color-scheme', scheme);
} catch {
  document.documentElement.setAttribute('data-mantine-color-scheme', 'light');
}
