const schedule = require('node-schedule');
const { getPosts, updatePost } = require('./store');

const jobs = new Map();

function notifyRenderer(post) {
  // Lazy require to avoid circular dependency at module load
  const { notifyRenderer: notify } = require('./main');
  notify(post);
}

async function schedulePost(post) {
  if (post.status !== 'pending') return;

  const scheduledDate = new Date(post.scheduledTime);
  if (scheduledDate <= new Date()) {
    const updated = await updatePost(post.id, { status: 'missed' });
    notifyRenderer(updated);
    return;
  }

  const job = schedule.scheduleJob(scheduledDate, async () => {
    jobs.delete(post.id);
    try {
      const { executePost } = require('./automation/session');
      for (const platform of post.platforms) {
        await executePost(platform, post.content);
      }
      const updated = await updatePost(post.id, {
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
      notifyRenderer(updated);
    } catch (err) {
      console.error(`Post ${post.id} failed:`, err.message);
      const updated = await updatePost(post.id, {
        status: 'failed',
        error: err.message,
      });
      notifyRenderer(updated);
    }
  });

  jobs.set(post.id, job);
}

async function rescheduleAll() {
  for (const post of getPosts()) {
    if (post.status === 'pending') {
      await schedulePost(post);
    }
  }
}

function cancelScheduledPost(id) {
  const job = jobs.get(id);
  if (job) {
    job.cancel();
    jobs.delete(id);
  }
}

module.exports = { schedulePost, rescheduleAll, cancelScheduledPost };
