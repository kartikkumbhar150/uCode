import cron from 'node-cron';
import User from '../models/User';
import Task from '../models/Task';
import Report from '../models/Report';

// Runs at 23:55 every day
export const initCronJobs = () => {
  cron.schedule('55 23 * * *', async () => {
    try {
      console.log('Running End of Day cron job...');
      const today = new Date();
      const startOfDay = new Date(today.setHours(0,0,0,0));
      const endOfDay = new Date(today.setHours(23,59,59,999));

      const users = await User.find();
      
      for (let user of users) {
        // Find tasks for today
        const tasks = await Task.find({
          userId: user._id,
          date: { $gte: startOfDay, $lte: endOfDay }
        });

        const completed = tasks.filter(t => t.isCompleted).length;
        const incomplete = tasks.length - completed;
        
        const summary = `Today you completed ${completed} tasks. ${incomplete} tasks were left incomplete.`;
        
        await Report.create({
          userId: user._id,
          date: new Date(),
          summary,
          productivityScore: tasks.length > 0 ? (completed/tasks.length)*100 : 0
        });
      }
      console.log('End of Day cron job completed.');
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
};
