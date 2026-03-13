/**
 * Family Friends Hibachi - 自动提醒 Cron Worker
 * 每天自动调用 Pages Function 发送活动提醒邮件
 */

export default {
	// Cron 触发器
	async scheduled(event, env, ctx) {
		console.log('Cron triggered at:', new Date().toISOString());
		
		try {
			const response = await fetch('https://family-friends-hibachi.pages.dev/api/cron/reminders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${env.CRON_SECRET}`,
				},
			});
			
			const result = await response.json();
			console.log('Reminder result:', result);
			
			if (result.success) {
				console.log(`✅ Sent ${result.processed} reminder emails`);
			} else {
				console.error('❌ Failed:', result.error);
			}
		} catch (error) {
			console.error('❌ Cron error:', error);
		}
	},
	
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		
		if (url.pathname === '/test') {
			const cronSecret = env.CRON_SECRET;
			if (!cronSecret || request.headers.get('X-Cron-Secret') !== cronSecret) {
				return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			await this.scheduled({}, env, ctx);
			return new Response(JSON.stringify({ 
				success: true, 
				message: 'Cron triggered manually' 
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		return new Response(JSON.stringify({
			name: 'Family Friends Hibachi Reminder Cron',
			schedule: 'Every day at 9:00 AM PST',
			test: '/test'
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};



