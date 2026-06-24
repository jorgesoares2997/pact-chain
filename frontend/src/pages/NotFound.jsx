import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-5xl">🌌</div>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-slate-500 text-sm">This URL doesn't exist on PactChain.</p>
      <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm mt-2">
        ← Go home
      </Link>
    </div>
  );
}
