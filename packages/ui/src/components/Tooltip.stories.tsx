import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Tooltip, TooltipProvider } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'Screenshots that shine',
    children: <Button variant="secondary">Hover me</Button>,
  },
};
