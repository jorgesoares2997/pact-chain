export default function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s =
    size === "sm"
      ? "w-4 h-4 border-2"
      : size === "lg"
      ? "w-10 h-10 border-4"
      : "w-6 h-6 border-2";
  return (
    <div className={`${s} border-purple-400 border-t-transparent rounded-full animate-spin inline-block`} />
  );
}
