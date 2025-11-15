/**
 * Example Test Migration
 *
 * This migration creates a simple test table to verify the Knex migration system works.
 * This can be removed after the migration system is validated.
 */

exports.up = function (knex) {
  return knex.schema.createTable('polls', (table) => {
    table.increments('id').primary();
    table.string('room_code', 6).notNullable().unique();
    table.string('question', 200).notNullable();
    table.jsonb('options').notNullable();
    table.string('state', 20).notNullable().defaultTo('waiting');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('polls');
};
