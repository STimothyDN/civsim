import { createRouter, createWebHistory } from 'vue-router'

const CommandCenter = () => import('../pages/CommandCenter.vue')
const OverviewRoute = () => import('../pages/OverviewRoute.vue')
const HomePage = () => import('../pages/HomePage.vue')
const ElectionSimulator = () => import('../pages/ElectionSimulator.vue')
const PreElectionPage = () => import('../pages/PreElectionPage.vue')
const ElectionOverview = () => import('../pages/ElectionOverview.vue')
const NationalElectionResults = () => import('../pages/NationalElectionResults.vue')
const RegionalElectionResults = () => import('../pages/RegionalElectionResults.vue')
const ProvincialElectionResults = () => import('../pages/ProvincialElectionResults.vue')
const RepresentativeDirectory = () => import('../pages/RepresentativeDirectory.vue')

const routes = [
  {
    path: '/',
    name: 'CommandCenter',
    component: CommandCenter,
    meta: { title: 'Civ Sim — Command Center' },
  },
  {
    path: '/overview',
    name: 'CountryOverview',
    component: OverviewRoute,
    meta: { title: 'Civ Sim — Country Overview' },
  },
  {
    path: '/builder',
    name: 'Builder',
    component: HomePage,
    meta: { title: 'Civ Sim — Builder' },
  },
  {
    path: '/provinces/details',
    redirect: { path: '/builder', query: { section: 'province-details' } },
  },
  {
    path: '/elections',
    component: ElectionSimulator,
    children: [
      {
        path: '',
        redirect: '/elections/pre-election',
      },
      {
        path: 'pre-election',
        name: 'PreElectionPage',
        component: PreElectionPage,
        meta: { title: 'Civ Sim — Pre-Election Simulator' },
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
      {
        path: 'directory',
        name: 'RepresentativeDirectory',
        component: RepresentativeDirectory,
        meta: { title: 'Civ Sim — Representative Directory' },
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
