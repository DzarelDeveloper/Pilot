import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Pilot",
  description: "AI infrastructure platform — CLI untuk vibe coding.",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Commands Reference', link: '/commands' },
          { text: 'Plugin Development', link: '/plugins' },
          { text: 'Configuration', link: '/config' },
          { text: 'FAQ & Troubleshooting', link: '/faq' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Dzareldeveloper/Pilot' }
    ],
    search: {
      provider: 'local'
    }
  }
})
