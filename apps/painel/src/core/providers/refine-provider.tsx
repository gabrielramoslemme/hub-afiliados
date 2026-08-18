'use client';

import { Refine } from '@refinedev/core';
import { RefineThemes, useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/nextjs-router';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntdApp } from 'antd';
import type { PropsWithChildren } from 'react';
import { dataProvider } from './data-provider';
import { theme } from '@/core/theme/theme';

import '@refinedev/antd/dist/reset.css';

export function RefineProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <AntdRegistry>
      <ConfigProvider theme={{ ...RefineThemes.Blue, ...theme }}>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true, disableTelemetry: true }}
          >
            {children}
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
