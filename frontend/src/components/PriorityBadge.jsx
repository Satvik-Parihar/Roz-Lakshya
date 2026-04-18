
const tiers = [
  { min: 70, label: 'High',   color: 'bg-red-100 text-red-700 border-red-300',    dot: 'bg-red-500'    },
  { min: 40, label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  { min: 0,  label: 'Low',    color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500'  },
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
