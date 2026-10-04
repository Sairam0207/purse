import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page empty">
      <h1>This page doesn't exist</h1>
      <p>The link may be old or mistyped.</p>
      <Link className="btn btn-primary" to="/">Go to overview</Link>
    </div>
  )
}
