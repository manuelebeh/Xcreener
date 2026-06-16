import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Open menu</Button>,
    items: [
      { label: 'Capture', value: 'capture' },
      { label: 'Beautify', value: 'beautify' },
      { label: 'Share', value: 'share' },
    ],
  },
};
