<script setup lang="ts">
import { App, Avatar, Button, Popconfirm, Tooltip } from 'antdv-next';
import { h } from 'vue';

import { PERMISSIONS, type OnlineUserSession } from '@nest-admin/shared';

import {
  apiOnlineUserPage,
  apiRevokeOnlineSession,
  type OnlineUserQuery,
} from '@/api/online-users';
import AppIcon from '@/components/core/base/app-icon/index.vue';
import AppTag from '@/components/core/base/app-tag/index.vue';
import ProSearch from '@/components/core/tables/pro-search/index.vue';
import type { FilterField } from '@/components/core/tables/pro-search/types';
import ProTable from '@/components/core/tables/pro-table/index.vue';
import { usePermission } from '@/composables/use-permission';
import { useTable } from '@/composables/use-table';
import { formatDateTime } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image-url';

const { message } = App.useApp();
const { can } = usePermission();

function describeClient(userAgent: string | null): string {
  if (!userAgent) return '未知客户端';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : '其他浏览器';
  const system = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/i.test(userAgent)
        ? 'iOS'
        : /Mac OS/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : '未知系统';

  return `${browser} / ${system}`;
}

async function revokeSession(record: OnlineUserSession): Promise<void> {
  await apiRevokeOnlineSession(record.userId, record.id);
  void message.success(`已下线 ${record.username} 的该登录设备`);
  await table.reload();
}

const table = useTable<OnlineUserSession, OnlineUserQuery>({
  columns: [
    {
      title: '用户',
      key: 'user',
      width: 220,
      render: (_value, record) =>
        h('div', { class: 'flex items-center gap-3 min-w-0' }, [
          h(
            Avatar,
            {
              size: 34,
              src: resolveImageUrl(record.avatar),
              class: 'shrink-0 a-bg-fill-secondary',
            },
            {
              icon: () =>
                h(AppIcon, {
                  icon: 'i-ri:user-3-line',
                  alt: '默认头像',
                  class: 'text-lg',
                }),
            },
          ),
          h('div', { class: 'min-w-0' }, [
            h(
              'div',
              { class: 'truncate font-medium a-color-text' },
              record.nickname || record.username,
            ),
            h(
              'div',
              { class: 'truncate text-xs a-color-text-tertiary' },
              record.nickname ? record.username : `用户 ID：${record.userId}`,
            ),
          ]),
        ]),
    },
    {
      title: '登录 IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 150,
      render: (value) => value || '—',
    },
    {
      title: '客户端',
      key: 'client',
      width: 170,
      render: (_value, record) =>
        h(
          Tooltip,
          { title: record.userAgent || '未记录 User-Agent' },
          {
            default: () =>
              h(
                'span',
                { class: 'block truncate cursor-default' },
                describeClient(record.userAgent),
              ),
          },
        ),
    },
    {
      title: '登录时间',
      key: 'createdAt',
      width: 170,
      render: (_value, record) => formatDateTime(record.createdAt),
    },
    {
      title: '过期时间',
      key: 'expiresAt',
      width: 170,
      render: (_value, record) => formatDateTime(record.expiresAt),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_value, record) =>
        h(AppTag, { tone: record.current ? 'success' : 'primary' }, () =>
          record.current ? '当前设备' : '在线',
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_value, record) => {
        if (record.current) {
          return h(
            Button,
            { type: 'link', size: 'small', disabled: true },
            () => '当前设备',
          );
        }

        if (!can(PERMISSIONS.USER_FORCE_LOGOUT)) {
          return '—';
        }

        return h(
          Popconfirm,
          {
            title: `确认下线 ${record.username} 的该设备？`,
            okText: '确认下线',
            cancelText: '取消',
            onConfirm: () => revokeSession(record),
          },
          {
            default: () =>
              h(
                Button,
                { type: 'link', size: 'small', danger: true },
                () => '强制下线',
              ),
          },
        );
      },
    },
  ],
  fetcher: apiOnlineUserPage,
  filters: { keyword: '', ip: '' },
  onError: (text) => void message.error(text),
});

const filterFields: FilterField<OnlineUserQuery>[] = [
  {
    label: '用户',
    key: 'keyword',
    placeholder: '用户名或昵称',
  },
  { label: '登录 IP', key: 'ip' },
];

defineOptions({ name: 'OnlineUserPage' });
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 gap-4">
    <ProSearch :table="table" :fields="filterFields" />
    <ProTable :table="table" row-key="id" />
  </div>
</template>
