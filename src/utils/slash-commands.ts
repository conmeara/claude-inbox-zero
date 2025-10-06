export interface SlashCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler: () => Promise<string> | string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    description: 'Show available commands',
    aliases: ['h', '?'],
    handler: () => {
      const commandList = SLASH_COMMANDS.map(cmd => {
        const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
        return `  /${cmd.name}${aliases}\n    ${cmd.description}`;
      }).join('\n\n');

      return `Available commands:\n\n${commandList}`;
    }
  },
  {
    name: 'status',
    description: 'Show current inbox status',
    handler: () => {
      return 'Status: Ready to process emails';
    }
  },
  {
    name: 'sync',
    description: 'Sync emails from IMAP server',
    handler: async () => {
      return 'Sync command - not yet implemented';
    }
  },
  {
    name: 'reset',
    description: 'Reset mock inbox to unread state',
    handler: () => {
      return 'Reset command - please restart with --reset flag';
    }
  },
  {
    name: 'quit',
    description: 'Exit the application',
    aliases: ['exit', 'q'],
    handler: () => {
      process.exit(0);
    }
  }
];

export function parseSlashCommand(input: string): { command: SlashCommand; args: string[] } | null {
  if (!input.startsWith('/')) {
    return null;
  }

  const parts = input.slice(1).trim().split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const command = SLASH_COMMANDS.find(cmd =>
    cmd.name === commandName || cmd.aliases?.includes(commandName)
  );

  if (!command) {
    return null;
  }

  return { command, args };
}

export function getCommandSuggestions(partialCommand: string): SlashCommand[] {
  if (!partialCommand.startsWith('/')) {
    return [];
  }

  const query = partialCommand.slice(1).toLowerCase();

  return SLASH_COMMANDS.filter(cmd => {
    const matchesName = cmd.name.startsWith(query);
    const matchesAlias = cmd.aliases?.some(alias => alias.startsWith(query));
    return matchesName || matchesAlias;
  });
}
