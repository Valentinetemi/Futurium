export type CareerField = {
  code: string;
  description: string;
  id: string;
  name: string;
  status: 'available' | 'coming-soon';
};

export const careerFields: readonly CareerField[] = [
  {
    code: 'CV',
    description: 'Teach machines to understand the visual world.',
    id: 'computer-vision',
    name: 'Computer Vision',
    status: 'available',
  },
  {
    code: 'AI',
    description:
      'Explore how intelligent systems reason, learn and make decisions.',
    id: 'artificial-intelligence',
    name: 'Artificial Intelligence',
    status: 'coming-soon',
  },
  {
    code: 'RB',
    description:
      'Build machines that can sense, plan and act in the physical world.',
    id: 'robotics',
    name: 'Robotics',
    status: 'coming-soon',
  },
  {
    code: 'QC',
    description:
      'Discover a new model of computing built on quantum behaviour.',
    id: 'quantum-computing',
    name: 'Quantum Computing',
    status: 'coming-soon',
  },
];
