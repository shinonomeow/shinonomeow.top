import { defineNavbarConfig } from 'vuepress-theme-plume'

export const zhNavbar = defineNavbarConfig([
  // { text: '首页', link: '/' },
  { text: '博客', link: '/blog/' },
  { text: '随笔', link: '/speak/' },
  // { text: '标签', link: '/blog/tags/' },
  {
    text: '笔记',
    items: [
      { text: 'LazyVim', link: '/notes/Lazyvim/README.md' },

    ]
  },
  { text: '归档', link: '/blog/archives/' },
  {
    text: '更多',
    items: [{ text: '友情链接', link: '/notes/friends.md' },
    { text: '关于我', link: '/notes/about.md' }],
  },
])

export const enNavbar = defineNavbarConfig([
  { text: 'Home', link: '/en/' },
  { text: 'Blog', link: '/en/blog/' },
  // { text: 'Tags', link: '/en/blog/tags/' },
  { text: 'Archives', link: '/en/blog/archives/' },
  {
    text: 'Notes',
    items: [{ text: 'Demo', link: '/en/notes/demo/README.md' }]
  },
])

