import { format, parse } from 'date-fns';

export const convertTo12HourFormat = (time) => {
  // Parse the time string to a Date object
  const date = parse(time, 'HH:mm', new Date());
  // Format the date to 12-hour format
  return format(date, 'h:mm a');
};