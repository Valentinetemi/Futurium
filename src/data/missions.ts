export type MissionBriefing = {
  durationMinutes: number;
  label: string;
  scenario: string;
  skills: readonly string[];
  title: string;
};

export const computerVisionMission: MissionBriefing = {
  durationMinutes: 5,
  label: 'CV-01',
  scenario:
    'An exploration robot has failed to detect an emergency supply crate. You must investigate the robot’s visual perception system and determine what went wrong.',
  skills: [
    'Object detection',
    'Confidence thresholds',
    'Environmental conditions',
  ],
  title: 'The Missing Supply Crate',
};
