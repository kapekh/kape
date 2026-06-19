import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { LanguageProvider } from '../lib/i18n'
import { detectLang } from '../lib/i18n-config'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

import type { TRPCRouter } from '#/integrations/trpc/router'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'

interface MyRouterContext {
  queryClient: QueryClient

  trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // Fetch i18n bootstrap (active language, language list, UI strings) and the
  // navigation tree once, server-side during SSR, so the first byte is correct.
  // Language is path-based (/en/…, /km/…) — derived from the URL, not a param.
  loader: async ({ context, location }) => {
    const boot = await context.queryClient.ensureQueryData(
      context.trpc.i18n.bootstrap.queryOptions({ lang: detectLang(location.pathname) }),
    )
    const nav = await context.queryClient.ensureQueryData(
      context.trpc.nav.tree.queryOptions({ lang: boot.lang }),
    )
    const settings = await context.queryClient.ensureQueryData(
      context.trpc.site.settings.queryOptions(),
    )
    return { ...boot, nav, settings }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'KAPE — Kampuchea Action to Promote Education',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  const { lang, languages, strings, nav, settings } = Route.useLoaderData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Admin + login have their own chrome — hide the public header/footer there.
  const chromeless =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/internalsources') ||
    pathname === '/login'
  return (
    <LanguageProvider lang={lang} languages={languages} strings={strings}>
      {!chromeless && <Header nav={nav} settings={settings} />}
      {/* Child routes render here. */}
      <Outlet />
      {!chromeless && <Footer settings={settings} />}
    </LanguageProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <html lang={detectLang(pathname)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
