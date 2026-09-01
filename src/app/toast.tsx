import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type ToastTone = 'neutral' | 'good' | 'warn' | 'bad'

interface Toast {
  id: number
  text: string
  tone: ToastTone
  icon?: ReactNode
}

interface ToastApi {
  show: (text: string, tone?: ToastTone, icon?: ReactNode) => void
}

const Ctx = createContext<ToastApi>({ show: () => {} })

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const next = useRef(0)

  const show = useCallback((text: string, tone: ToastTone = 'neutral', icon?: ReactNode) => {
    const id = next.current++
    setItems((prev) => [...prev.slice(-2), { id, text, tone, icon }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-host">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className={`toast${t.tone !== 'neutral' ? ` toast--${t.tone}` : ''}`}
              initial={{ opacity: 0, y: -14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            >
              {t.icon}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
