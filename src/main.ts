import { ErrorLog, MonitoringResponse, Stats } from './types/types';
import { exec } from 'child_process';
import os from 'os';

export class Vision {
	private stats: Stats;

	constructor() {
		this.stats = {
			requestCount: 0,
			errorCount: 0,
			totalLatency: 0,
			dbQueryCount: 0,
			dbErrorCount: 0,
			dbTotalLatency: 0,
			lastErrors: [],
		};
	}

	// VisionRequest request tracking
	// ------------------------------
	// The VisionRequest function takes the duration of the request
	// and updates the statistics of requests to the server.
	// It increases the counter of the total number
	// of requests (RequestCount) and adds the transmitted
	// duration to the total delay time of all requests (TotalLatency),
	// ensuring that these values are securely updated using a
	// mutex lock (Lock/Unlock) to avoid conflicts
	// when accessing statistics from different execution threads.
	public visionRequest(duration: number): void {
		this.stats.requestCount++;
		this.stats.totalLatency += duration;
	}

	// VisionError error tracking
	// --------------------------
	// The VisionError function accepts an err error object and
	// performs the following actions: locks the mutex
	// for secure access to the fields of the stats structure,
	// increments the error count counter, creates an error log
	// containing the current time (Timestamp) and
	// error message (Error), checks the length of the array
	// of recent errors (LastErrors) and, if it contains
	// more than 10 elements, it deletes the oldest element,
	// and then adds a new error to the array.
	public visionError(err: Error, method?: string, path?: string): void {
		this.stats.errorCount++;

		const errLog: ErrorLog = {
			timestamp: new Date(),
			method: method ? method : '',
			path: path ? path : '',
			error: err.message,
		};

		// Limit the number of recent errors to 10
		if (this.stats.lastErrors.length >= 10) {
			this.stats.lastErrors.shift();
		}

		this.stats.lastErrors.push(errLog);
	}

	// VisionDBQuery tracking a database request
	// -----------------------------------------
	// The VisionDBQuery function takes the duration
	// of a database query and updates the corresponding
	// statistics by incrementing the database query
	// counter (DBQueryCount) and adding the
	// transmitted duration to the total amount
	// of database query delays (DBTotalLatency)
	public visionDBQuery(duration: number): void {
		this.stats.dbQueryCount++;
		this.stats.dbTotalLatency += duration;
	}

	// VisionDBError tracking a DB error
	// ---------------------------------
	// The VisionDBError function increments
	// the database error counter (DBErrorCount)
	// when an error occurs.
	public visionDBError(): void {
		this.stats.dbErrorCount++;
	}

	// The getCPUUsage function tries to get
	// the percentage of CPU usage for the last second.
	private async getCPUUsage(): Promise<number> {
		return new Promise((resolve, reject) => {
			exec(
				"top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'",
				(error, stdout) => {
					if (error) {
						return reject(`Failed to get CPU usage: ${error}`);
					}
					resolve(parseFloat(stdout));
				}
			);
		});
	}

	// The getMemoryUsage function gets
	// information about virtual memory usage.
	private async getMemoryUsage(): Promise<number> {
		return new Promise((resolve, reject) => {
			const totalMemory: number = os.totalmem();
			const freeMemory: number = os.freemem();
			const usedMemory: number = totalMemory - freeMemory;
			resolve((usedMemory / totalMemory) * 100);
		});
	}

	// The getNetworkStats function collects network
	// interface statistics. If the network data cannot
	// be retrieved, an error is returned. If the
	// interface is found, the amount of data received i
	// n megabytes is calculated and the result is returned.
	private async getNetworkStats(): Promise<number> {
		return new Promise((resolve, reject) => {
			exec("ifstat -S 1 1 | awk 'NR==3 {print $1}'", (error, stdout) => {
				if (error) {
					return reject(`Failed to get network stats: ${error}`);
				}
				resolve(parseFloat(stdout) / (1024 * 1024)); // Convert to MB
			});
		});
	}

	// GetVisionStats getting statistics
	// ---------------------------------
	// The GetVisionStats function collects
	// all the data into one structure
	// and outputs it as a JSON structure.
	public async getVisionStats(): Promise<MonitoringResponse> {
		const cpuUsage: number = await this.getCPUUsage().catch((err) => {
			console.error(`Error getting CPU usage: ${err}`);
			return 0;
		});

		const memoryUsage: number = await this.getMemoryUsage().catch((err) => {
			console.error(`Error getting memory usage: ${err}`);
			return 0;
		});

		const networkRecv: number = await this.getNetworkStats().catch(
			(err) => {
				console.error(`Error getting network stats: ${err}`);
				return 0;
			}
		);

		return {
			requests: {
				total: this.stats.requestCount,
				errors: this.stats.errorCount,
				successRate:
					this.stats.requestCount === 0
						? 0
						: ((this.stats.requestCount - this.stats.errorCount) /
								this.stats.requestCount) *
							100,
				avgLatencyMs:
					this.stats.requestCount === 0
						? 0
						: this.stats.totalLatency / this.stats.requestCount,
			},
			database: {
				totalQueries: this.stats.dbQueryCount,
				errors: this.stats.dbErrorCount,
				avgLatencyMs:
					this.stats.dbQueryCount === 0
						? 0
						: this.stats.dbTotalLatency / this.stats.dbQueryCount,
			},
			system: {
				cpuUsage: cpuUsage,
				memoryUsage: memoryUsage,
				networkRecv: networkRecv,
			},
			lastErrors: this.stats.lastErrors,
		};
	}
}
