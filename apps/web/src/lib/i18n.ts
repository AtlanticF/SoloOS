import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en'
import zhCN from '@/locales/zh-CN'

const saved = localStorage.getItem('soloos-lang') ?? 'en'

i18next
  .use(initReactI18next)
  .init({
    lng: saved,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN },
    },
    interpolation: { escapeValue: false },
  })

export default i18next
