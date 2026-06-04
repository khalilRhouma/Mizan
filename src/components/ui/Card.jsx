export default function Card({ children, className = '', title, action }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-lg md:text-xl font-medium tracking-headline text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
