import { MySqlDialect } from 'drizzle-orm/mysql-core';

import { availableMessage } from './message.service';

describe('availableMessage', () => {
  it('把当前用户 id 固定加入个人收件箱查询条件', () => {
    const dialect = new MySqlDialect();
    const firstUserQuery = dialect.sqlToQuery(availableMessage(7));
    const secondUserQuery = dialect.sqlToQuery(availableMessage(9));

    expect(firstUserQuery.sql).toContain(
      '`sys_notice_recipient`.`user_id` = ?',
    );
    expect(firstUserQuery.params[0]).toBe(7);
    expect(secondUserQuery.params[0]).toBe(9);
  });
});
