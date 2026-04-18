
const tiers = [
  { min: 70, label: 'High',   color: 'bg-rose-100 text-rose-700 border-rose-300', dot: 'bg-rose-500' },
  { min: 40, label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
  { min: 0,  label: 'Low',    color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
];

export default function PriorityBadge({ score = 0 }) {
  const tier = tiers.find((t) => score >= t.min) ?? tiers[2];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
      {tier.label}
    </span>
  );
}
