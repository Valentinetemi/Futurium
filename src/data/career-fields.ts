export type CareerField = {
  id: string;
  name: string;
};

export const careerFields: readonly CareerField[] = [
  { id: 'space-systems', name: 'Space Systems' },
  { id: 'quantum-computing', name: 'Quantum Computing' },
  { id: 'climate-technology', name: 'Climate Technology' },
  { id: 'robotics', name: 'Robotics' },
];
