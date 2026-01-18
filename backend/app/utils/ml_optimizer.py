"""
Machine Learning Performance Optimizer
Uses ML algorithms to predict and optimize system performance.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json
import logging
from ..logging_config import get_logger

logger = get_logger(__name__)

@dataclass
class PerformancePrediction:
    """Performance prediction result."""
    timestamp: datetime
    predicted_cpu_usage: float
    predicted_memory_usage: float
    predicted_response_time: float
    predicted_throughput: float
    confidence_score: float
    recommendations: List[str]

@dataclass
class AnomalyDetection:
    """Anomaly detection result."""
    timestamp: datetime
    anomaly_score: float
    is_anomaly: bool
    affected_metrics: List[str]
    severity: str  # low, medium, high, critical
    description: str

@dataclass
class OptimizationRecommendation:
    """Optimization recommendation."""
    category: str  # database, cache, api, system
    priority: str   # low, medium, high, critical
    action: str
    expected_improvement: float
    implementation_effort: str  # low, medium, high
    description: str

class MLPerformanceOptimizer:
    """Machine Learning-based Performance Optimizer."""
    
    def __init__(self):
        self.cpu_model = None
        self.memory_model = None
        self.response_time_model = None
        self.throughput_model = None
        self.anomaly_detector = None
        self.scalers = {}
        self.encoders = {}
        self.is_trained = False
        self.training_data = []
        self.model_version = "1.0"
        
    def collect_training_data(self, metrics_history: List[Dict]) -> bool:
        """Collect and prepare training data from metrics history."""
        try:
            processed_data = []
            
            for metrics in metrics_history:
                # Extract features
                features = self._extract_features(metrics)
                if features:
                    processed_data.append(features)
            
            if len(processed_data) < 100:
                logger.warning("Insufficient training data. Need at least 100 samples.")
                return False
            
            self.training_data = processed_data
            logger.info(f"Collected {len(processed_data)} training samples")
            return True
            
        except Exception as e:
            logger.error(f"Failed to collect training data: {e}")
            return False
    
    def _extract_features(self, metrics: Dict) -> Optional[Dict]:
        """Extract features from metrics data."""
        try:
            features = {}
            
            # Time-based features
            timestamp = datetime.fromisoformat(metrics.get('timestamp', datetime.utcnow().isoformat()))
            features['hour'] = timestamp.hour
            features['day_of_week'] = timestamp.weekday()
            features['is_weekend'] = 1 if timestamp.weekday() >= 5 else 0
            
            # System metrics
            if 'system' in metrics:
                system = metrics['system']
                features['cpu_usage'] = system.get('cpu', {}).get('usage_percent', 0)
                features['memory_usage'] = system.get('memory', {}).get('percent', 0)
                features['disk_usage'] = system.get('disk', {}).get('percent', 0)
                features['load_avg'] = system.get('cpu', {}).get('load_average', [0, 0, 0])[0]
            
            # API metrics
            if 'api' in metrics:
                api = metrics['api']
                features['api_requests'] = api.get('total_requests', 0)
                features['api_response_time'] = api.get('avg_duration_ms', 0)
                features['api_throughput'] = api.get('throughput_rps', 0)
                features['api_errors'] = api.get('error_rate_percent', 0)
            
            # Database metrics
            if 'database' in metrics:
                db = metrics['database']
                features['db_connections'] = db.get('connection_pool', {}).get('active_connections', 0)
                features['db_query_time'] = db.get('queries', {}).get('avg_time', 0)
                features['db_slow_queries'] = db.get('queries', {}).get('slow_queries', 0)
            
            # Cache metrics
            if 'cache' in metrics:
                cache = metrics['cache']
                features['cache_hit_rate'] = cache.get('hit_rate_percent', 0)
                features['cache_memory'] = cache.get('memory_usage_mb', 0)
            
            # Validate features
            if len(features) < 5:  # Need minimum features
                return None
            
            return features
            
        except Exception as e:
            logger.error(f"Failed to extract features: {e}")
            return None
    
    def train_models(self) -> bool:
        """Train ML models for performance prediction."""
        try:
            if not self.training_data:
                logger.error("No training data available")
                return False
            
            # Convert to DataFrame
            df = pd.DataFrame(self.training_data)
            
            # Prepare target variables
            targets = {
                'cpu_usage': df['cpu_usage'].values,
                'memory_usage': df['memory_usage'].values,
                'response_time': df['api_response_time'].values,
                'throughput': df['api_throughput'].values
            }
            
            # Prepare features
            feature_columns = [col for col in df.columns if col not in targets]
            X = df[feature_columns].values
            
            # Train models for each target
            models = {}
            scalers = {}
            
            for target_name, y in targets.items():
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                
                # Scale features
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                # Train model
                model = RandomForestRegressor(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1
                )
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                y_pred = model.predict(X_test_scaled)
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                logger.info(f"Model {target_name}: MSE={mse:.4f}, R2={r2:.4f}")
                
                models[target_name] = model
                scalers[target_name] = scaler
            
            # Store models
            self.cpu_model = models['cpu_usage']
            self.memory_model = models['memory_usage']
            self.response_time_model = models['response_time']
            self.throughput_model = models['throughput']
            self.scalers = scalers
            
            # Train anomaly detector
            self._train_anomaly_detector(df)
            
            self.is_trained = True
            logger.info("ML models trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to train models: {e}")
            return False
    
    def _train_anomaly_detector(self, df: pd.DataFrame):
        """Train anomaly detection model."""
        try:
            # Use all features for anomaly detection
            X = df.fillna(0).values
            
            # Train Isolation Forest
            self.anomaly_detector = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            self.anomaly_detector.fit(X)
            
            logger.info("Anomaly detector trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train anomaly detector: {e}")
    
    def predict_performance(self, current_metrics: Dict, horizon_minutes: int = 30) -> PerformancePrediction:
        """Predict future performance metrics."""
        try:
            if not self.is_trained:
                return self._create_default_prediction(horizon_minutes)
            
            # Extract features
            features = self._extract_features(current_metrics)
            if not features:
                return self._create_default_prediction(horizon_minutes)
            
            # Convert to array
            feature_values = np.array([list(features.values())])
            
            # Make predictions
            predictions = {}
            confidence_scores = {}
            
            for target_name, model in [
                ('cpu_usage', self.cpu_model),
                ('memory_usage', self.memory_model),
                ('response_time', self.response_time_model),
                ('throughput', self.throughput_model)
            ]:
                if model and target_name in self.scalers:
                    # Scale features
                    X_scaled = self.scalers[target_name].transform(feature_values)
                    
                    # Predict
                    pred = model.predict(X_scaled)[0]
                    predictions[target_name] = max(0, pred)  # Ensure non-negative
                    
                    # Calculate confidence (simplified)
                    confidence_scores[target_name] = 0.85  # Placeholder
            
            # Generate recommendations
            recommendations = self._generate_recommendations(predictions, features)
            
            # Calculate overall confidence
            avg_confidence = np.mean(list(confidence_scores.values())) if confidence_scores else 0.5
            
            return PerformancePrediction(
                timestamp=datetime.utcnow() + timedelta(minutes=horizon_minutes),
                predicted_cpu_usage=predictions.get('cpu_usage', 0),
                predicted_memory_usage=predictions.get('memory_usage', 0),
                predicted_response_time=predictions.get('response_time', 0),
                predicted_throughput=predictions.get('throughput', 0),
                confidence_score=avg_confidence,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Failed to predict performance: {e}")
            return self._create_default_prediction(horizon_minutes)
    
    def _create_default_prediction(self, horizon_minutes: int) -> PerformancePrediction:
        """Create default prediction when models are not available."""
        return PerformancePrediction(
            timestamp=datetime.utcnow() + timedelta(minutes=horizon_minutes),
            predicted_cpu_usage=50.0,
            predicted_memory_usage=60.0,
            predicted_response_time=200.0,
            predicted_throughput=100.0,
            confidence_score=0.5,
            recommendations=["Train ML models for better predictions"]
        )
    
    def detect_anomalies(self, current_metrics: Dict) -> AnomalyDetection:
        """Detect performance anomalies."""
        try:
            if not self.anomaly_detector:
                return AnomalyDetection(
                    timestamp=datetime.utcnow(),
                    anomaly_score=0.0,
                    is_anomaly=False,
                    affected_metrics=[],
                    severity="low",
                    description="Anomaly detector not trained"
                )
            
            # Extract features
            features = self._extract_features(current_metrics)
            if not features:
                return AnomalyDetection(
                    timestamp=datetime.utcnow(),
                    anomaly_score=0.0,
                    is_anomaly=False,
                    affected_metrics=[],
                    severity="low",
                    description="Insufficient features for anomaly detection"
                )
            
            # Convert to array
            X = np.array([list(features.values())])
            
            # Detect anomaly
            anomaly_score = self.anomaly_detector.decision_function(X)[0]
            is_anomaly = self.anomaly_detector.predict(X)[0] == -1
            
            # Determine affected metrics
            affected_metrics = []
            if is_anomaly:
                # Find metrics that deviate significantly
                for metric_name, value in features.items():
                    if metric_name in ['cpu_usage', 'memory_usage', 'api_response_time']:
                        if value > 80:  # High threshold
                            affected_metrics.append(metric_name)
            
            # Determine severity
            if is_anomaly:
                if anomaly_score < -0.5:
                    severity = "critical"
                elif anomaly_score < -0.2:
                    severity = "high"
                else:
                    severity = "medium"
            else:
                severity = "low"
            
            description = self._generate_anomaly_description(affected_metrics, severity)
            
            return AnomalyDetection(
                timestamp=datetime.utcnow(),
                anomaly_score=float(anomaly_score),
                is_anomaly=is_anomaly,
                affected_metrics=affected_metrics,
                severity=severity,
                description=description
            )
            
        except Exception as e:
            logger.error(f"Failed to detect anomalies: {e}")
            return AnomalyDetection(
                timestamp=datetime.utcnow(),
                anomaly_score=0.0,
                is_anomaly=False,
                affected_metrics=[],
                severity="low",
                description=f"Anomaly detection failed: {str(e)}"
            )
    
    def _generate_anomaly_description(self, affected_metrics: List[str], severity: str) -> str:
        """Generate description for anomaly."""
        if not affected_metrics:
            return "No significant anomalies detected"
        
        metric_names = {
            'cpu_usage': 'CPU usage',
            'memory_usage': 'memory usage',
            'api_response_time': 'API response time',
            'api_throughput': 'API throughput',
            'cache_hit_rate': 'cache hit rate'
        }
        
        affected_names = [metric_names.get(m, m) for m in affected_metrics]
        
        if severity == "critical":
            return f"Critical anomaly detected in {', '.join(affected_names)}. Immediate attention required."
        elif severity == "high":
            return f"High anomaly detected in {', '.join(affected_names)}. Investigation recommended."
        else:
            return f"Minor anomaly detected in {', '.join(affected_names)}. Monitor closely."
    
    def _generate_recommendations(self, predictions: Dict, features: Dict) -> List[str]:
        """Generate optimization recommendations based on predictions."""
        recommendations = []
        
        # CPU recommendations
        if predictions.get('cpu_usage', 0) > 80:
            recommendations.append("High CPU usage predicted. Consider scaling up or optimizing CPU-intensive operations.")
        elif predictions.get('cpu_usage', 0) > 60:
            recommendations.append("Moderate CPU usage predicted. Monitor for potential optimization opportunities.")
        
        # Memory recommendations
        if predictions.get('memory_usage', 0) > 85:
            recommendations.append("High memory usage predicted. Consider memory optimization or adding more RAM.")
        elif predictions.get('memory_usage', 0) > 70:
            recommendations.append("Moderate memory usage predicted. Review memory usage patterns.")
        
        # Response time recommendations
        if predictions.get('response_time', 0) > 1000:
            recommendations.append("Slow response times predicted. Consider database optimization or caching improvements.")
        elif predictions.get('response_time', 0) > 500:
            recommendations.append("Moderate response times predicted. Review query performance.")
        
        # Throughput recommendations
        if predictions.get('throughput', 0) < 50:
            recommendations.append("Low throughput predicted. Consider scaling or performance optimizations.")
        
        # Time-based recommendations
        hour = features.get('hour', 0)
        if 9 <= hour <= 17:  # Business hours
            recommendations.append("Business hours predicted. Ensure adequate resources for peak load.")
        
        return recommendations
    
    def get_optimization_recommendations(self, current_metrics: Dict, historical_data: List[Dict] = None) -> List[OptimizationRecommendation]:
        """Get comprehensive optimization recommendations."""
        recommendations = []
        
        try:
            # Analyze current metrics
            current_features = self._extract_features(current_metrics)
            if not current_features:
                return recommendations
            
            # Database recommendations
            if current_features.get('db_query_time', 0) > 200:
                recommendations.append(OptimizationRecommendation(
                    category="database",
                    priority="high",
                    action="Optimize slow database queries",
                    expected_improvement=30.0,
                    implementation_effort="medium",
                    description="Database queries are taking too long. Consider adding indexes, optimizing queries, or implementing query caching."
                ))
            
            # Cache recommendations
            if current_features.get('cache_hit_rate', 0) < 70:
                recommendations.append(OptimizationRecommendation(
                    category="cache",
                    priority="medium",
                    action="Improve cache hit rate",
                    expected_improvement=25.0,
                    implementation_effort="low",
                    description="Cache hit rate is below optimal. Consider adjusting cache TTL, cache size, or cache key strategies."
                ))
            
            # API recommendations
            if current_features.get('api_response_time', 0) > 500:
                recommendations.append(OptimizationRecommendation(
                    category="api",
                    priority="high",
                    action="Optimize API response times",
                    expected_improvement=40.0,
                    implementation_effort="medium",
                    description="API response times are slow. Consider implementing request deduplication, response caching, or optimizing business logic."
                ))
            
            # System recommendations
            if current_features.get('cpu_usage', 0) > 80:
                recommendations.append(OptimizationRecommendation(
                    category="system",
                    priority="critical",
                    action="Scale up resources",
                    expected_improvement=50.0,
                    implementation_effort="high",
                    description="CPU usage is critically high. Consider scaling up server resources or implementing load balancing."
                ))
            
            # Memory recommendations
            if current_features.get('memory_usage', 0) > 85:
                recommendations.append(OptimizationRecommendation(
                    category="system",
                    priority="high",
                    action="Optimize memory usage",
                    expected_improvement=35.0,
                    implementation_effort="medium",
                    description="Memory usage is high. Consider implementing memory-efficient algorithms or adding more RAM."
                ))
            
            # Sort by priority
            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            recommendations.sort(key=lambda x: priority_order.get(x.priority, 4))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return recommendations
    
    def save_models(self, filepath: str) -> bool:
        """Save trained models to file."""
        try:
            model_data = {
                'cpu_model': self.cpu_model,
                'memory_model': self.memory_model,
                'response_time_model': self.response_time_model,
                'throughput_model': self.throughput_model,
                'anomaly_detector': self.anomaly_detector,
                'scalers': self.scalers,
                'model_version': self.model_version,
                'training_data_count': len(self.training_data)
            }
            
            joblib.dump(model_data, filepath)
            logger.info(f"Models saved to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save models: {e}")
            return False
    
    def load_models(self, filepath: str) -> bool:
        """Load trained models from file."""
        try:
            model_data = joblib.load(filepath)
            
            self.cpu_model = model_data.get('cpu_model')
            self.memory_model = model_data.get('memory_model')
            self.response_time_model = model_data.get('response_time_model')
            self.throughput_model = model_data.get('throughput_model')
            self.anomaly_detector = model_data.get('anomaly_detector')
            self.scalers = model_data.get('scalers', {})
            self.model_version = model_data.get('model_version', '1.0')
            
            self.is_trained = all([
                self.cpu_model, self.memory_model, 
                self.response_time_model, self.throughput_model
            ])
            
            logger.info(f"Models loaded from {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and statistics."""
        return {
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'training_data_count': len(self.training_data),
            'models': {
                'cpu_model': self.cpu_model is not None,
                'memory_model': self.memory_model is not None,
                'response_time_model': self.response_time_model is not None,
                'throughput_model': self.throughput_model is not None,
                'anomaly_detector': self.anomaly_detector is not None
            },
            'feature_count': len(self.training_data[0]) if self.training_data else 0
        }

# Global optimizer instance
_ml_optimizer = None

def get_ml_optimizer() -> MLPerformanceOptimizer:
    """Get or create global ML optimizer instance."""
    global _ml_optimizer
    if _ml_optimizer is None:
        _ml_optimizer = MLPerformanceOptimizer()
    return _ml_optimizer
