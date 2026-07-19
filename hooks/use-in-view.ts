import { useEffect, useRef, useState } from "react"

/**
 * true assim que o elemento entra no viewport (ou chega perto, via
 * rootMargin) pela primeira vez — usado para renderizar conteúdo pesado
 * (SVG de rota, sparkline) só sob demanda, como o Feed exige. Não volta a
 * false ao sair do viewport: o card não deve re-buscar dados toda vez que o
 * usuário rola pra cima e pra baixo.
 */
export function useInView<T extends Element>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView || !ref.current) return

    const element = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [inView])

  return { ref, inView }
}
