import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Tooltip, Legend)

export const CHART_COLORS = {
  accent: '#2F5D5A',
  amber: '#C98A3B',
  good: '#3C7A5C',
  critical: '#B4483D',
  purple: '#8A6FA8',
  grey: '#D2D1CA',
}
