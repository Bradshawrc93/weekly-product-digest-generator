const config = require('../src/utils/config');

describe('Configuration Module', () => {
  test('should load environment variables', () => {
    expect(config.jira).toBeDefined();
    expect(config.jira.baseUrl).toBeDefined();
    expect(config.jira.email).toBeDefined();
    expect(config.jira.apiToken).toBeDefined();
    
    expect(config.notion).toBeDefined();
    expect(config.notion.apiKey).toBeDefined();
    expect(config.notion.databaseId).toBeDefined();
  });

  test('should load squad configuration', () => {
    expect(config.squads).toBeDefined();
    expect(Array.isArray(config.squads)).toBe(true);
    expect(config.squads.length).toBeGreaterThan(0);
  });

  test('should have valid squad structure', () => {
    config.squads.forEach(squad => {
      expect(squad.name).toBeDefined();
      expect(squad.displayName).toBeDefined();
      expect(squad.jiraUuid).toBeDefined();
      expect(squad.description).toBeDefined();
    });
  });

  test('should have status categories', () => {
    expect(config.statusCategories).toBeDefined();
    expect(config.statusCategories.backlog).toBeDefined();
    expect(config.statusCategories.todo).toBeDefined();
    expect(config.statusCategories.inProgress).toBeDefined();
    expect(config.statusCategories.done).toBeDefined();
  });

  test('should get squad by UUID', () => {
    const firstSquad = config.squads[0];
    const foundSquad = config.getSquadByUuid(firstSquad.jiraUuid);
    expect(foundSquad).toEqual(firstSquad);
  });

  test('should get squad by name', () => {
    const firstSquad = config.squads[0];
    const foundSquad = config.getSquadByName(firstSquad.name);
    expect(foundSquad).toEqual(firstSquad);
  });

  test('should get all squad UUIDs', () => {
    const uuids = config.getAllSquadUuids();
    expect(Array.isArray(uuids)).toBe(true);
    expect(uuids.length).toBe(config.squads.length);
    uuids.forEach(uuid => {
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBeGreaterThan(0);
    });
  });

  test('should get all squad names', () => {
    const names = config.getAllSquadNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBe(config.squads.length);
    names.forEach(name => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  test('should categorize status correctly', () => {
    const backlogStatus = config.statusCategories.backlog[0];
    const todoStatus = config.statusCategories.todo[0];
    const inProgressStatus = config.statusCategories.inProgress[0];
    const doneStatus = config.statusCategories.done[0];

    expect(config.getStatusCategory(backlogStatus)).toBe('backlog');
    expect(config.getStatusCategory(todoStatus)).toBe('todo');
    expect(config.getStatusCategory(inProgressStatus)).toBe('inProgress');
    expect(config.getStatusCategory(doneStatus)).toBe('done');
  });
});
