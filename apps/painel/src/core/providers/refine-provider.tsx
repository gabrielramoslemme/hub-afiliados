'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { RefineThemes, useNotificationProvider } from '@refinedev/antd';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router';
import { App as AntdApp, ConfigProvider } from 'antd';
import { type PropsWithChildren, Suspense } from 'react';
import { theme } from '@/core/theme/theme';
import { dataProvider } from './data-provider';

import '@refinedev/antd/dist/reset.css';

export function RefineProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <AntdRegistry>
      <ConfigProvider theme={{ ...RefineThemes.Blue, ...theme }}>
        <AntdApp>
          {/*
            O RouteChangeHandler do @refinedev/nextjs-router usa useSearchParams(),
            que o Next exige dentro de um boundary de Suspense para prerenderizar.
          */}
          <Suspense>
            <Refine
              routerProvider={routerProvider}
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                disableTelemetry: true,
              }}
            >
              {children}
            </Refine>
          </Suspense>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
