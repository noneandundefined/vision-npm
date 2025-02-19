// A model for monitoring the application
export type Stats = {
	requestCount: number;
	errorCount: number;
	totalLatency: number;
	dbQueryCount: number;
	dbErrorCount: number;
	dbTotalLatency: number;
	lastErrors: Array<ErrorLog>;
};

// The Server error model
export type ErrorLog = {
	timestamp: Date;
	method: string;
	path: string;
	error: string;
};

// A model for the vision monitoring response
export type MonitoringResponse = {
	requests: {
		total: number;
		errors: number;
		successRate: number;
		avgLatencyMs: number;
	};
	database: {
		totalQueries: number;
		errors: number;
		avgLatencyMs: number;
	};
	system: {
		cpuUsage: number;
		memoryUsage: number;
		networkRecv: number;
	};
	lastErrors?: Array<ErrorLog>;
};
