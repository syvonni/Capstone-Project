import WelcomeInline from './WelcomeModal.jsx'

export default {
  title: 'Business Owner/WelcomeInline',
  component: WelcomeInline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export const WelcomePage = {
  args: {
    onSelect: (type) => console.log('Selected business type:', type),
    onLinkExisting: () => console.log('Link existing business clicked'),
  },
  parameters: {
    storyDescription: 'Inline welcome screen with business type selection and link existing business option',
  },
}

export const InteractiveFlow = {
  args: {
    onSelect: (type) => console.log('Selected business type:', type),
    onLinkExisting: () => console.log('Link existing business clicked'),
  },
  parameters: {
    storyDescription: 'Interactive: Click through the welcome flow options',
  },
}
