import { PERMISSIONS } from '@nest-admin/shared';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AppModule } from '../src/app.module';
import { configureE2eEnvironment, resetE2eRedis } from './e2e-env';

interface ResponseBody<T = unknown> {
  code: number;
  message: string;
  data: T;
}

interface UserRef {
  id: number;
  username: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserRef;
  passwordChangeRequired: boolean;
}

interface PermissionItem {
  id: number;
  code: string;
}

/** GET /roles/:id/grants 的响应形状（只声明用例关心的字段） */
interface GrantRef {
  permissionIds: number[];
  menuIds: number[];
  catalog: PermissionItem[];
  menuTree: { id: number }[];
}

const PRIMARY_PASSWORD = 'E2ePrimary123!';
const NEXT_PASSWORD = 'E2eNext123!';
const VIEWER_PASSWORD = 'E2eViewer123!';
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const PRIMARY_USERNAME = `e2e_primary_${suffix}`.slice(0, 32);
const VIEWER_USERNAME = `e2e_viewer_${suffix}`.slice(0, 32);

describe('认证与 RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let admin: AuthResult;
  let primaryUser: UserRef;
  let viewerUser: UserRef;
  let viewerAuth: AuthResult;
  let roleId: number;
  let scopedDepartmentId: number;
  let otherDepartmentId: number;

  beforeAll(async () => {
    configureE2eEnvironment(15);
    await resetE2eRedis();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    primaryUser = await register(PRIMARY_USERNAME, PRIMARY_PASSWORD);
    admin = await login(
      'admin',
      process.env.E2E_ADMIN_PASSWORD ??
        process.env.SEED_ADMIN_PASSWORD ??
        'admin123456',
    );

    const viewer = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        username: VIEWER_USERNAME,
        password: VIEWER_PASSWORD,
        nickname: 'E2E Viewer',
      })
      .expect(201);
    viewerUser = (viewer.body as ResponseBody<UserRef>).data;

    const permissions = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const userRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.USER_READ);
    const logList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.LOG_LIST);
    const loginLogList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.LOGIN_LOG_LIST);
    const logRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.LOG_READ);
    const loginLogRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.LOGIN_LOG_READ);
    const sessionList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.USER_SESSION_LIST);
    const forceLogout = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.USER_FORCE_LOGOUT);
    const transferList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.DEPT_TRANSFER_LIST);
    // 部门详情/更新/删除也发给 viewer：它 dataScope=self，正好用来验证
    // 这三个入口的范围判定。注意必须给到权限，否则会被 PermissionGuard
    // 先拦成 403，根本走不到断言想测的那一步。
    const deptRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.DEPT_READ);
    const deptUpdate = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.DEPT_UPDATE);
    const deptDelete = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.DEPT_DELETE);
    const fileList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.FILE_LIST);
    const fileRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.FILE_READ);
    const fileDelete = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.FILE_DELETE);
    const noticeList = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_LIST);
    const noticeRead = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_READ);
    const noticeCreate = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_CREATE);
    const noticeUpdate = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_UPDATE);
    const noticeDelete = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_DELETE);
    const noticePublish = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_PUBLISH);
    const noticeWithdraw = (
      permissions.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.NOTICE_WITHDRAW);
    expect(userRead).toBeDefined();
    expect(logList).toBeDefined();
    expect(loginLogList).toBeDefined();
    expect(logRead).toBeDefined();
    expect(loginLogRead).toBeDefined();
    expect(sessionList).toBeDefined();
    expect(forceLogout).toBeDefined();
    expect(transferList).toBeDefined();
    expect(deptRead).toBeDefined();
    expect(deptUpdate).toBeDefined();
    expect(deptDelete).toBeDefined();
    expect(fileList).toBeDefined();
    expect(fileRead).toBeDefined();
    expect(fileDelete).toBeDefined();
    expect(noticeList).toBeDefined();
    expect(noticeRead).toBeDefined();
    expect(noticeCreate).toBeDefined();
    expect(noticeUpdate).toBeDefined();
    expect(noticeDelete).toBeDefined();
    expect(noticePublish).toBeDefined();
    expect(noticeWithdraw).toBeDefined();

    const role = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        code: `e2e_viewer_${suffix}`.slice(0, 64),
        name: 'E2E 只读用户',
        dataScope: 'self',
      })
      .expect(201);
    roleId = (role.body as ResponseBody<{ id: number }>).data.id;

    await request(app.getHttpServer())
      .put(`/api/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        ids: [
          userRead!.id,
          logList!.id,
          loginLogList!.id,
          logRead!.id,
          loginLogRead!.id,
          sessionList!.id,
          forceLogout!.id,
          transferList!.id,
          deptRead!.id,
          deptUpdate!.id,
          deptDelete!.id,
          fileList!.id,
          fileRead!.id,
          fileDelete!.id,
          noticeList!.id,
          noticeRead!.id,
          noticeCreate!.id,
          noticeUpdate!.id,
          noticeDelete!.id,
          noticePublish!.id,
          noticeWithdraw!.id,
        ],
      })
      .expect(204);

    await request(app.getHttpServer())
      .put(`/api/users/${viewerUser.id}/roles`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ ids: [roleId] })
      .expect(204);

    const scopedDepartment = await request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        parentId: 1,
        name: `E2E 可见部门 ${suffix}`,
        code: `e2e_scope_${suffix}`,
      })
      .expect(201);
    scopedDepartmentId = (scopedDepartment.body as ResponseBody<{ id: number }>)
      .data.id;

    const otherDepartment = await request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        parentId: 1,
        name: `E2E 其他部门 ${suffix}`,
        code: `e2e_other_${suffix}`,
      })
      .expect(201);
    otherDepartmentId = (otherDepartment.body as ResponseBody<{ id: number }>)
      .data.id;

    await request(app.getHttpServer())
      .patch(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ deptId: scopedDepartmentId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/departments/${scopedDepartmentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ parentId: otherDepartmentId, moveReason: 'E2E 生成可见迁移记录' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/departments/${scopedDepartmentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ parentId: 1, moveReason: 'E2E 恢复可见部门层级' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        parentId: scopedDepartmentId,
        moveReason: 'E2E 生成不可见迁移记录',
      })
      .expect(200);

    viewerAuth = await login(VIEWER_USERNAME, VIEWER_PASSWORD);
  });

  afterAll(async () => {
    if (app && admin) {
      if (viewerUser?.id && scopedDepartmentId) {
        await request(app.getHttpServer())
          .patch(`/api/users/${viewerUser.id}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send({ deptId: null })
          .catch(() => undefined);
      }
      if (otherDepartmentId && scopedDepartmentId) {
        await request(app.getHttpServer())
          .patch(`/api/departments/${otherDepartmentId}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send({ parentId: 1, moveReason: 'E2E 清理迁移夹具' })
          .catch(() => undefined);
      }
      if (otherDepartmentId) {
        await request(app.getHttpServer())
          .delete(`/api/departments/${otherDepartmentId}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .catch(() => undefined);
      }
      if (scopedDepartmentId) {
        await request(app.getHttpServer())
          .delete(`/api/departments/${scopedDepartmentId}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .catch(() => undefined);
      }
      await removeUser(primaryUser?.id);
      await removeUser(viewerUser?.id);
      if (roleId) {
        await request(app.getHttpServer())
          .delete(`/api/roles/${roleId}`)
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .catch(() => undefined);
      }
    }

    await app?.close();
  });

  it('受保护接口拒绝未认证请求', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/users/${viewerUser.id}`)
      .expect(401);

    expect((response.body as ResponseBody).code).toBe(401);
  });

  it('登录、改密、刷新轮换和退出吊销形成完整会话链路', async () => {
    const oldAuth = await login(PRIMARY_USERNAME, PRIMARY_PASSWORD);
    expect(oldAuth.passwordChangeRequired).toBe(false);

    const profile = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${oldAuth.accessToken}`)
      .expect(200);
    expect((profile.body as ResponseBody<{ username: string }>).data).toEqual(
      expect.objectContaining({ username: PRIMARY_USERNAME }),
    );

    await request(app.getHttpServer())
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${oldAuth.accessToken}`)
      .send({ oldPassword: PRIMARY_PASSWORD, newPassword: NEXT_PASSWORD })
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${oldAuth.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: oldAuth.refreshToken })
      .expect(401);

    const nextAuth = await login(PRIMARY_USERNAME, NEXT_PASSWORD);
    expect(nextAuth.passwordChangeRequired).toBe(false);

    const rotated = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: nextAuth.refreshToken })
      .expect(200);
    const rotatedTokens = (
      rotated.body as ResponseBody<
        Pick<AuthResult, 'accessToken' | 'refreshToken'>
      >
    ).data;

    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${nextAuth.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${rotatedTokens.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: nextAuth.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${rotatedTokens.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: rotatedTokens.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${rotatedTokens.accessToken}`)
      .expect(401);
  });

  it('普通角色只能访问被授予的接口，超级管理员可直接通过', async () => {
    await request(app.getHttpServer())
      .get(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('普通角色查询登录日志和操作日志时只返回自己的记录', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/me/profile')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .send({ nickname: 'E2E Viewer Updated' })
      .expect(200);

    const loginLogs = await request(app.getHttpServer())
      .get('/api/login-logs')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const loginLogData = (
      loginLogs.body as ResponseBody<{ list: Array<{ userId: number }> }>
    ).data;
    expect(loginLogData.list.length).toBeGreaterThan(0);
    expect(
      loginLogData.list.every((item) => item.userId === viewerUser.id),
    ).toBe(true);

    const operationLogs = await request(app.getHttpServer())
      .get('/api/operation-logs')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const operationLogData = (
      operationLogs.body as ResponseBody<{
        list: Array<{ userId: number }>;
      }>
    ).data;
    expect(operationLogData.list.length).toBeGreaterThan(0);
    expect(
      operationLogData.list.every((item) => item.userId === viewerUser.id),
    ).toBe(true);

    const adminLog = await request(app.getHttpServer())
      .get('/api/operation-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const adminLogData = (
      adminLog.body as ResponseBody<{
        list: Array<{ userId: number | null }>;
      }>
    ).data;
    expect(
      adminLogData.list.some((item) => item.userId === admin.user.id),
    ).toBe(true);
  });

  it('普通角色不能通过日志 id 查看其他用户的详情', async () => {
    const adminLogs = await request(app.getHttpServer())
      .get('/api/operation-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const rows = (
      adminLogs.body as ResponseBody<{
        list: Array<{ id: number; userId: number | null }>;
      }>
    ).data.list;
    const otherUserLog = rows.find((item) => item.userId === admin.user.id);
    expect(otherUserLog).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/operation-logs/${otherUserLog!.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    const adminLoginLogs = await request(app.getHttpServer())
      .get('/api/login-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const otherUserLoginLog = (
      adminLoginLogs.body as ResponseBody<{
        list: Array<{ id: number; userId: number | null }>;
      }>
    ).data.list.find((item) => item.userId === admin.user.id);
    expect(otherUserLoginLog).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/login-logs/${otherUserLoginLog!.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);
  });

  it('在线用户列表和下线操作都遵守目标用户数据范围', async () => {
    const viewerSessions = await request(app.getHttpServer())
      .get('/api/online-users')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const viewerSessionData = (
      viewerSessions.body as ResponseBody<{
        list: Array<{ userId: number; current: boolean }>;
      }>
    ).data;
    expect(viewerSessionData.list.length).toBeGreaterThan(0);
    expect(
      viewerSessionData.list.every((item) => item.userId === viewerUser.id),
    ).toBe(true);

    const allSessions = await request(app.getHttpServer())
      .get('/api/online-users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const allSessionData = (
      allSessions.body as ResponseBody<{
        list: Array<{ id: number; userId: number }>;
      }>
    ).data;
    const adminSession = allSessionData.list.find(
      (item) => item.userId === admin.user.id,
    );
    expect(adminSession).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/users/${admin.user.id}/sessions/${adminSession!.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/users/${admin.user.id}/force-logout`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);
  });

  it('文件资源管理按上传人数据范围过滤并保护详情与删除', async () => {
    const adminUpload = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', Buffer.from('admin-file'), {
        filename: 'admin-resource.png',
        contentType: 'image/png',
      })
      .expect(200);
    const adminResource = (
      adminUpload.body as ResponseBody<{ id: number; uploaderId: number }>
    ).data;

    const viewerUpload = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .attach('file', Buffer.from('viewer-file'), {
        filename: 'viewer-resource.png',
        contentType: 'image/png',
      })
      .expect(200);
    const viewerResource = (
      viewerUpload.body as ResponseBody<{ id: number; uploaderId: number }>
    ).data;

    const viewerPage = await request(app.getHttpServer())
      .get('/api/files/resources')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const viewerResources = (
      viewerPage.body as ResponseBody<{
        list: Array<{ id: number; uploaderId: number }>;
      }>
    ).data.list;
    expect(viewerResources.length).toBeGreaterThan(0);
    expect(
      viewerResources.every((item) => item.uploaderId === viewerUser.id),
    ).toBe(true);

    const adminPage = await request(app.getHttpServer())
      .get('/api/files/resources')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const adminResources = (
      adminPage.body as ResponseBody<{
        list: Array<{ id: number; uploaderId: number }>;
      }>
    ).data.list;
    expect(adminResources.some((item) => item.id === adminResource.id)).toBe(
      true,
    );
    expect(adminResources.some((item) => item.id === viewerResource.id)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .get(`/api/files/resources/${adminResource.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/files/resources/${adminResource.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/files/resources/${viewerResource.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/files/resources/${adminResource.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(204);
  });

  it('通知公告管理按创建人数据范围隔离并限制收件人', async () => {
    const adminNoticeResponse = await request(app.getHttpServer())
      .post('/api/notices')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        title: `E2E 管理员公告 ${suffix}`,
        content: '管理员可见的测试公告',
        targetType: 'all',
      })
      .expect(201);
    const adminNotice = (
      adminNoticeResponse.body as ResponseBody<{
        id: number;
        createdBy: number;
      }>
    ).data;

    const viewerPageBeforeCreate = await request(app.getHttpServer())
      .get('/api/notices')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const viewerNoticesBeforeCreate = (
      viewerPageBeforeCreate.body as ResponseBody<{
        list: Array<{ id: number }>;
      }>
    ).data.list;
    expect(viewerNoticesBeforeCreate).not.toContainEqual(
      expect.objectContaining({ id: adminNotice.id }),
    );

    const userOptions = await request(app.getHttpServer())
      .get('/api/notices/target-options')
      .query({ targetType: 'user' })
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const scopedUsers = (
      userOptions.body as ResponseBody<Array<{ id: number }>>
    ).data;
    expect(scopedUsers.map((item) => item.id)).toEqual([viewerUser.id]);

    const departmentOptions = await request(app.getHttpServer())
      .get('/api/notices/target-options')
      .query({ targetType: 'department' })
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const scopedDepartments = (
      departmentOptions.body as ResponseBody<Array<{ id: number }>>
    ).data;
    expect(scopedDepartments.map((item) => item.id)).toEqual([
      scopedDepartmentId,
    ]);

    await request(app.getHttpServer())
      .get(`/api/notices/${adminNotice.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/notices/${adminNotice.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .send({ title: '越权修改公告' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/notices/${adminNotice.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    const viewerNoticeResponse = await request(app.getHttpServer())
      .post('/api/notices')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .send({
        title: `E2E 范围内公告 ${suffix}`,
        content: '普通用户范围内的测试公告',
        targetType: 'all',
      })
      .expect(201);
    const viewerNotice = (
      viewerNoticeResponse.body as ResponseBody<{
        id: number;
        createdBy: number;
      }>
    ).data;
    expect(viewerNotice.createdBy).toBe(viewerUser.id);

    const viewerPage = await request(app.getHttpServer())
      .get('/api/notices')
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const viewerNotices = (
      viewerPage.body as ResponseBody<{
        list: Array<{ id: number; createdBy: number }>;
      }>
    ).data.list;
    expect(viewerNotices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: viewerNotice.id,
          createdBy: viewerUser.id,
        }),
      ]),
    );
    expect(viewerNotices).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: adminNotice.id })]),
    );

    const publishedViewerNotice = await request(app.getHttpServer())
      .post(`/api/notices/${viewerNotice.id}/publish`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(201);
    expect(
      (publishedViewerNotice.body as ResponseBody<{ recipientCount: number }>)
        .data.recipientCount,
    ).toBe(1);

    await request(app.getHttpServer())
      .post(`/api/notices/${viewerNotice.id}/withdraw`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/notices/${viewerNotice.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/notices/${adminNotice.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(204);
  });

  it('部门迁移历史按用户所属部门范围过滤', async () => {
    const scopedTransfers = await request(app.getHttpServer())
      .get(`/api/departments/${scopedDepartmentId}/transfers`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);
    const scopedData = (
      scopedTransfers.body as ResponseBody<{
        list: Array<{ deptId: number }>;
      }>
    ).data;
    expect(scopedData.list.length).toBeGreaterThan(0);
    expect(
      scopedData.list.every((item) => item.deptId === scopedDepartmentId),
    ).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartmentId}/transfers`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    const adminTransfers = await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartmentId}/transfers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(
      (
        adminTransfers.body as ResponseBody<{
          list: Array<{ deptId: number }>;
        }>
      ).data.list.length,
    ).toBeGreaterThan(0);
  });

  it('部门详情/更新/删除都遵守数据范围', async () => {
    // viewer 角色 dataScope=self 且部门是 scopedDepartmentId，
    // 与 findTransfers 用的是同一套判定，三个入口都要按不存在处理越权目标。
    await request(app.getHttpServer())
      .get(`/api/departments/${scopedDepartmentId}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .send({ name: `越权改名 ${suffix}` })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(404);

    // 超管不受数据范围限制，同一个目标要能正常读到
    await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    // 越权请求没有改动任何东西：名称仍是创建时的值
    const stillIntact = await request(app.getHttpServer())
      .get(`/api/departments/${otherDepartmentId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(
      (stillIntact.body as ResponseBody<{ name: string }>).data.name,
    ).toContain('E2E 其他部门');
  });

  it('角色权限撤销后已缓存的授权立即失效', async () => {
    await request(app.getHttpServer())
      .put(`/api/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ ids: [] })
      .expect(204);

    const response = await request(app.getHttpServer())
      .get(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${viewerAuth.accessToken}`)
      .expect(403);

    expect((response.body as ResponseBody).message).toContain(
      PERMISSIONS.USER_READ,
    );
  });

  it('授权聚合接口一次返回回显与候选项，且非法 id 不会留下半授权状态', async () => {
    const permissionsResponse = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const userRead = (
      permissionsResponse.body as ResponseBody<PermissionItem[]>
    ).data.find((item) => item.code === PERMISSIONS.USER_READ);

    expect(userRead).toBeDefined();

    const menuTreeResponse = await request(app.getHttpServer())
      .get('/api/menus')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const firstMenu = (menuTreeResponse.body as ResponseBody<{ id: number }[]>)
      .data[0];

    expect(firstMenu).toBeDefined();

    await request(app.getHttpServer())
      .put(`/api/roles/${roleId}/grants`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissionIds: [userRead!.id], menuIds: [firstMenu.id] })
      .expect(204);

    const granted = await readGrants();

    expect(granted.permissionIds).toEqual([userRead!.id]);
    expect(granted.menuIds).toEqual([firstMenu.id]);
    // 候选项随回显一起返回，授权界面不必再分别请求权限目录与菜单树
    expect(granted.catalog.length).toBeGreaterThan(0);
    expect(granted.menuTree.length).toBeGreaterThan(0);

    // 菜单 id 非法时整体拒绝：校验发生在事务之前，不会出现
    // 「权限码已替换、菜单没替换」的半授权状态
    await request(app.getHttpServer())
      .put(`/api/roles/${roleId}/grants`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ permissionIds: [], menuIds: [999999999] })
      .expect(400);

    const unchanged = await readGrants();

    expect(unchanged.permissionIds).toEqual([userRead!.id]);
    expect(unchanged.menuIds).toEqual([firstMenu.id]);
  });

  it('禁用用户会当场吊销其全部会话，重新启用也换不出新令牌', async () => {
    // 先正常刷新一次：既证明这条会话本来是活的（排除「刷新链路本身不通」造成的假通过），
    // 也拿到轮换后的令牌——轮换会让上一个 refreshToken 失效，
    // 所以后面必须用 rotated 而不是 viewerAuth 里那个。
    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: viewerAuth.refreshToken })
      .expect(200);
    const rotated = (
      refreshed.body as ResponseBody<
        Pick<AuthResult, 'accessToken' | 'refreshToken'>
      >
    ).data;

    await request(app.getHttpServer())
      .patch(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'disabled' })
      .expect(200);

    // 已签发的访问令牌同样立刻失效（JwtStrategy 每次请求回库查 status）
    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'active' })
      .expect(200);

    // 关键断言，而且必须「先禁用再启用」才测得出差别：
    // 禁用期间直接刷新的话，auth.service 会在 status!==active 分支里顺手吊销全部会话，
    // 那样即使 update() 少写了 revokeAllForUser 这条也会通过。
    // 恢复启用后再拿旧 refreshToken，只有「禁用当场吊销」才拦得住。
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
  });

  /** 拉取授权聚合接口，校验回显与候选项 */
  async function readGrants(): Promise<GrantRef> {
    const response = await request(app.getHttpServer())
      .get(`/api/roles/${roleId}/grants`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    return (response.body as ResponseBody<GrantRef>).data;
  }

  async function register(
    username: string,
    password: string,
  ): Promise<UserRef> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password, nickname: username });

    expect(response.status).toBe(201);
    return (response.body as ResponseBody<AuthResult>).data.user;
  }

  async function login(
    username: string,
    password: string,
  ): Promise<AuthResult> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password })
      .expect(200);

    return (response.body as ResponseBody<AuthResult>).data;
  }

  async function removeUser(id: number | undefined): Promise<void> {
    if (!id) return;

    await request(app.getHttpServer())
      .delete(`/api/users/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .catch(() => undefined);
  }
});
