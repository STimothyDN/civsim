import { createRouter, createWebHistory } from 'vue-router'

const HomePage = () => import('../pages/HomePage.vue')
const ProvinceDetails = () => import('../pages/ProvinceDetails.vue')
const ElectionOverview = () => import('../pages/ElectionOverview.vue')
const NationalElectionResults = () => import('../pages/NationalElectionResults.vue')
const RegionalElectionResults = () => import('../pages/RegionalElectionResults.vue')
const ProvincialElectionResults = () => import('../pages/ProvincialElectionResults.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { title: 'Civ Sim — Home' },
  },
  {
    path: '/provinces/details',
    name: 'ProvinceDetails',
    component: ProvinceDetails,
    meta: { title: 'Civ Sim — Province Details' },
  },
  {
    path: '/elections/overview',
    name: 'ElectionOverview',
    component: ElectionOverview,
    meta: { title: 'Civ Sim — Election Overview' },
  },
  {
    path: '/elections/national',
    name: 'NationalElectionResults',
    component: NationalElectionResults,
    meta: { title: 'Civ Sim — National Election Results' },
  },
  {
    path: '/elections/regional',
    name: 'RegionalElectionResults',
    component: RegionalElectionResults,
    meta: { title: 'Civ Sim — Regional Election Results' },
  },
  {
    path: '/elections/provincial',
    name: 'ProvincialElectionResults',
    component: ProvincialElectionResults,
    meta: { title: 'Civ Sim — Provincial Election Results' },
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
