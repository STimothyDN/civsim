import { createRouter, createWebHistory } from 'vue-router'

const HomePage = () => import('../pages/HomePage.vue')
const ElectionSimulator = () => import('../pages/ElectionSimulator.vue')
const ElectionOverview = () => import('../pages/ElectionOverview.vue')
const NationalElectionResults = () => import('../pages/NationalElectionResults.vue')
const RegionalElectionResults = () => import('../pages/RegionalElectionResults.vue')
const ProvincialElectionResults = () => import('../pages/ProvincialElectionResults.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { title: 'Civ Sim — Data Input and Overview' },
  },
  {
    path: '/provinces/details',
    redirect: { path: '/', query: { section: 'province-details' } },
  },
  {
    path: '/elections',
    component: ElectionSimulator,
    children: [
      {
        path: '',
        redirect: '/elections/overview',
      },
      {
        path: 'overview',
        name: 'ElectionOverview',
        component: ElectionOverview,
        meta: { title: 'Civ Sim — Election Simulator' },
      },
      {
        path: 'national',
        name: 'NationalElectionResults',
        component: NationalElectionResults,
        meta: { title: 'Civ Sim — National Election Results' },
      },
      {
        path: 'regional',
        name: 'RegionalElectionResults',
        component: RegionalElectionResults,
        meta: { title: 'Civ Sim — Regional Election Results' },
      },
      {
        path: 'provincial',
        name: 'ProvincialElectionResults',
        component: ProvincialElectionResults,
        meta: { title: 'Civ Sim — Provincial Election Results' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Update document title on navigation
router.afterEach((to) => {
  document.title = to.meta.title || 'Civ Sim'
})

export default router
