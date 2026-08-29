import { validateEnv } from './env.validation';

const requiredEnv = {
  DB_HOST: '127.0.0.1',
  DB_USER: 'root',
  DB_NAME: 'nest_admin_test',
  JWT_ACCESS_SECRET: 'access-secret-at-least-sixteen',
  JWT_REFRESH_SECRET: 'refresh-secret-at-least-sixteen',
};

describe('文件上传环境变量校验', () => {
  it('本地模式不要求任何 S3 配置', () => {
    expect(validateEnv(requiredEnv)).toMatchObject({
      UPLOAD_DRIVER: 'local',
      UPLOAD_LOCAL_DIR: '.uploads',
      UPLOAD_LOCAL_URL_PREFIX: '/uploads',
      UPLOAD_MAX_FILE_SIZE_MB: 10,
    });
  });

  it('S3 模式必须配置 bucket', () => {
    expect(() => validateEnv({ ...requiredEnv, UPLOAD_DRIVER: 's3' })).toThrow(
      'UPLOAD_S3_BUCKET',
    );
  });

  it('S3 静态密钥必须成对配置', () => {
    expect(() =>
      validateEnv({
        ...requiredEnv,
        UPLOAD_DRIVER: 's3',
        UPLOAD_S3_BUCKET: 'assets',
        UPLOAD_S3_ACCESS_KEY_ID: 'access-key',
      }),
    ).toThrow('UPLOAD_S3_SECRET_ACCESS_KEY');
  });

  it('空字符串按未配置处理，允许使用默认凭证链', () => {
    expect(
      validateEnv({
        ...requiredEnv,
        UPLOAD_DRIVER: 's3',
        UPLOAD_S3_BUCKET: 'assets',
        UPLOAD_S3_ENDPOINT: '',
        UPLOAD_S3_ACCESS_KEY_ID: '',
        UPLOAD_S3_SECRET_ACCESS_KEY: '',
      }),
    ).toMatchObject({
      UPLOAD_DRIVER: 's3',
      UPLOAD_S3_BUCKET: 'assets',
      UPLOAD_S3_ACCESS_KEY_ID: undefined,
      UPLOAD_S3_SECRET_ACCESS_KEY: undefined,
    });
  });
});
