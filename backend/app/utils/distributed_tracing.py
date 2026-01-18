"""
Distributed Tracing System
Provides comprehensive request tracing across microservices.
"""

import uuid
import time
import json
import threading
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import contextmanager
from functools import wraps
import logging
from ..logging_config import get_logger

logger = get_logger(__name__)

@dataclass
class Span:
    """Represents a single span in a trace."""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_ms: Optional[float]
    status: str  # success, error, timeout
    tags: Dict[str, Any]
    logs: List[Dict[str, Any]]
    service_name: str
    resource: str

@dataclass
class Trace:
    """Represents a complete trace with multiple spans."""
    trace_id: str
    root_span_id: str
    spans: List[Span]
    start_time: datetime
    end_time: Optional[datetime]
    duration_ms: Optional[float]
    status: str
    service_name: str
    metadata: Dict[str, Any]

class TraceContext:
    """Thread-local context for trace propagation."""
    
    def __init__(self):
        self._local = threading.local()
    
    def set_current_span(self, span: Span):
        """Set current span in context."""
        self._local.current_span = span
    
    def get_current_span(self) -> Optional[Span]:
        """Get current span from context."""
        return getattr(self._local, 'current_span', None)
    
    def set_trace_id(self, trace_id: str):
        """Set trace ID in context."""
        self._local.trace_id = trace_id
    
    def get_trace_id(self) -> Optional[str]:
        """Get trace ID from context."""
        return getattr(self._local, 'trace_id', None)
    
    def clear(self):
        """Clear context."""
        self._local.__dict__.clear()

class DistributedTracer:
    """Distributed tracing implementation."""
    
    def __init__(self, service_name: str = "islamic-characters-api"):
        self.service_name = service_name
        self.context = TraceContext()
        self.active_traces: Dict[str, Trace] = {}
        self.completed_traces: List[Trace] = []
        self.max_completed_traces = 1000
        self.sampling_rate = 1.0  # Sample all traces
        self.enabled = True
        
    def start_trace(self, operation_name: str, resource: str = "api") -> Span:
        """Start a new trace."""
        if not self.enabled:
            return None
        
        trace_id = str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        
        span = Span(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=None,
            operation_name=operation_name,
            start_time=datetime.utcnow(),
            end_time=None,
            duration_ms=None,
            status="success",
            tags={},
            logs=[],
            service_name=self.service_name,
            resource=resource
        )
        
        # Create trace
        trace = Trace(
            trace_id=trace_id,
            root_span_id=span_id,
            spans=[span],
            start_time=span.start_time,
            end_time=None,
            duration_ms=None,
            status="success",
            service_name=self.service_name,
            metadata={}
        )
        
        # Store in active traces
        self.active_traces[trace_id] = trace
        
        # Set context
        self.context.set_trace_id(trace_id)
        self.context.set_current_span(span)
        
        logger.debug(f"Started trace {trace_id} for operation {operation_name}")
        
        return span
    
    def start_span(self, operation_name: str, parent_span: Optional[Span] = None, resource: str = "api") -> Span:
        """Start a new span within existing trace."""
        if not self.enabled:
            return None
        
        trace_id = self.context.get_trace_id()
        if not trace_id:
            # Start new trace if none exists
            return self.start_trace(operation_name, resource)
        
        span_id = str(uuid.uuid4())
        current_span = self.context.get_current_span()
        parent_span_id = parent_span.span_id if parent_span else (current_span.span_id if current_span else None)
        
        span = Span(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            start_time=datetime.utcnow(),
            end_time=None,
            duration_ms=None,
            status="success",
            tags={},
            logs=[],
            service_name=self.service_name,
            resource=resource
        )
        
        # Add to trace
        if trace_id in self.active_traces:
            self.active_traces[trace_id].spans.append(span)
        
        # Set context
        self.context.set_current_span(span)
        
        logger.debug(f"Started span {span_id} for operation {operation_name}")
        
        return span
    
    def finish_span(self, span: Span, status: str = "success", error: Optional[Exception] = None):
        """Finish a span."""
        if not self.enabled or not span:
            return
        
        span.end_time = datetime.utcnow()
        span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
        span.status = status
        
        if error:
            span.status = "error"
            span.tags['error'] = str(error)
            span.tags['error_type'] = type(error).__name__
            span.logs.append({
                'timestamp': datetime.utcnow().isoformat(),
                'level': 'error',
                'message': str(error)
            })
        
        logger.debug(f"Finished span {span.span_id} in {span.duration_ms:.2f}ms")
        
        # Check if this is the root span
        trace_id = span.trace_id
        if trace_id in self.active_traces:
            trace = self.active_traces[trace_id]
            if span.span_id == trace.root_span_id:
                self.finish_trace(trace_id)
    
    def finish_trace(self, trace_id: str):
        """Finish a trace."""
        if not self.enabled or trace_id not in self.active_traces:
            return
        
        trace = self.active_traces[trace_id]
        trace.end_time = datetime.utcnow()
        trace.duration_ms = (trace.end_time - trace.start_time).total_seconds() * 1000
        
        # Determine trace status
        error_spans = [span for span in trace.spans if span.status == "error"]
        if error_spans:
            trace.status = "error"
        else:
            trace.status = "success"
        
        # Move to completed traces
        self.completed_traces.append(trace)
        del self.active_traces[trace_id]
        
        # Limit completed traces
        if len(self.completed_traces) > self.max_completed_traces:
            self.completed_traces = self.completed_traces[-self.max_completed_traces:]
        
        logger.debug(f"Finished trace {trace_id} in {trace.duration_ms:.2f}ms")
        
        # Send to external system (if configured)
        self._send_trace(trace)
    
    def _send_trace(self, trace: Trace):
        """Send trace to external tracing system."""
        try:
            # This would integrate with systems like Jaeger, Zipkin, or OpenTelemetry
            # For now, we'll just log the trace
            trace_data = {
                'trace_id': trace.trace_id,
                'duration_ms': trace.duration_ms,
                'span_count': len(trace.spans),
                'status': trace.status,
                'service': trace.service_name
            }
            
            logger.info(f"Trace completed: {json.dumps(trace_data)}")
            
        except Exception as e:
            logger.error(f"Failed to send trace: {e}")
    
    def add_tag(self, key: str, value: Any):
        """Add tag to current span."""
        if not self.enabled:
            return
        
        current_span = self.context.get_current_span()
        if current_span:
            current_span.tags[key] = value
    
    def add_log(self, level: str, message: str, **kwargs):
        """Add log entry to current span."""
        if not self.enabled:
            return
        
        current_span = self.context.get_current_span()
        if current_span:
            log_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': level,
                'message': message
            }
            log_entry.update(kwargs)
            current_span.logs.append(log_entry)
    
    def get_trace_headers(self) -> Dict[str, str]:
        """Get trace headers for propagation."""
        if not self.enabled:
            return {}
        
        trace_id = self.context.get_trace_id()
        current_span = self.context.get_current_span()
        
        headers = {}
        if trace_id:
            headers['X-Trace-Id'] = trace_id
        if current_span:
            headers['X-Span-Id'] = current_span.span_id
            headers['X-Parent-Span-Id'] = current_span.parent_span_id or ""
        
        return headers
    
    def continue_trace(self, headers: Dict[str, str]) -> Optional[Span]:
        """Continue a trace from headers."""
        if not self.enabled:
            return None
        
        trace_id = headers.get('X-Trace-Id')
        span_id = headers.get('X-Span-Id')
        parent_span_id = headers.get('X-Parent-Span-Id')
        
        if not trace_id:
            return None
        
        # Create new span as child of incoming span
        new_span_id = str(uuid.uuid4())
        
        span = Span(
            trace_id=trace_id,
            span_id=new_span_id,
            parent_span_id=span_id,
            operation_name="continued_request",
            start_time=datetime.utcnow(),
            end_time=None,
            duration_ms=None,
            status="success",
            tags={},
            logs=[],
            service_name=self.service_name,
            resource="api"
        )
        
        # Add to existing trace or create new one
        if trace_id in self.active_traces:
            self.active_traces[trace_id].spans.append(span)
        else:
            trace = Trace(
                trace_id=trace_id,
                root_span_id=span_id,
                spans=[span],
                start_time=span.start_time,
                end_time=None,
                duration_ms=None,
                status="success",
                service_name=self.service_name,
                metadata={}
            )
            self.active_traces[trace_id] = trace
        
        # Set context
        self.context.set_trace_id(trace_id)
        self.context.set_current_span(span)
        
        return span
    
    def get_trace_statistics(self) -> Dict[str, Any]:
        """Get tracing statistics."""
        stats = {
            'active_traces': len(self.active_traces),
            'completed_traces': len(self.completed_traces),
            'enabled': self.enabled,
            'sampling_rate': self.sampling_rate,
            'service_name': self.service_name
        }
        
        if self.completed_traces:
            # Calculate statistics from completed traces
            durations = [trace.duration_ms for trace in self.completed_traces if trace.duration_ms]
            if durations:
                stats['avg_duration_ms'] = sum(durations) / len(durations)
                stats['min_duration_ms'] = min(durations)
                stats['max_duration_ms'] = max(durations)
            
            # Calculate error rate
            error_traces = [trace for trace in self.completed_traces if trace.status == "error"]
            stats['error_rate_percent'] = (len(error_traces) / len(self.completed_traces)) * 100
            
            # Calculate span statistics
            span_counts = [len(trace.spans) for trace in self.completed_traces]
            stats['avg_spans_per_trace'] = sum(span_counts) / len(span_counts)
        
        return stats
    
    def get_trace_by_id(self, trace_id: str) -> Optional[Trace]:
        """Get trace by ID."""
        return self.active_traces.get(trace_id) or \
               next((trace for trace in self.completed_traces if trace.trace_id == trace_id), None)
    
    def get_recent_traces(self, limit: int = 50) -> List[Trace]:
        """Get recent completed traces."""
        return self.completed_traces[-limit:] if self.completed_traces else []
    
    def clear_traces(self):
        """Clear all traces."""
        self.active_traces.clear()
        self.completed_traces.clear()
        self.context.clear()
        logger.info("All traces cleared")
    
    def enable(self):
        """Enable tracing."""
        self.enabled = True
        logger.info("Tracing enabled")
    
    def disable(self):
        """Disable tracing."""
        self.enabled = False
        logger.info("Tracing disabled")

# Global tracer instance
_tracer = None

def get_tracer(service_name: str = "islamic-characters-api") -> DistributedTracer:
    """Get or create global tracer instance."""
    global _tracer
    if _tracer is None:
        _tracer = DistributedTracer(service_name)
    return _tracer

# Decorators for automatic tracing
def trace(operation_name: str = None, resource: str = "api"):
    """Decorator for automatic function tracing."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = get_tracer()
            if not tracer.enabled:
                return func(*args, **kwargs)
            
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            # Start span
            span = tracer.start_span(op_name, resource=resource)
            
            try:
                # Add function arguments as tags (if not sensitive)
                if args and hasattr(args[0], '__class__'):
                    tracer.add_tag('function_class', args[0].__class__.__name__)
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Add result info
                if hasattr(result, '__len__'):
                    tracer.add_tag('result_count', len(result))
                
                return result
                
            except Exception as e:
                tracer.add_log('error', f"Function failed: {str(e)}")
                raise
            finally:
                tracer.finish_span(span)
        
        return wrapper
    return decorator

def trace_async(operation_name: str = None, resource: str = "api"):
    """Decorator for automatic async function tracing."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            tracer = get_tracer()
            if not tracer.enabled:
                return await func(*args, **kwargs)
            
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            # Start span
            span = tracer.start_span(op_name, resource=resource)
            
            try:
                # Execute async function
                result = await func(*args, **kwargs)
                
                # Add result info
                if hasattr(result, '__len__'):
                    tracer.add_tag('result_count', len(result))
                
                return result
                
            except Exception as e:
                tracer.add_log('error', f"Async function failed: {str(e)}")
                raise
            finally:
                tracer.finish_span(span)
        
        return wrapper
    return decorator

# Context manager for manual tracing
@contextmanager
def trace_context(operation_name: str, resource: str = "api"):
    """Context manager for manual tracing."""
    tracer = get_tracer()
    if not tracer.enabled:
        yield None
        return
    
    span = tracer.start_span(operation_name, resource=resource)
    
    try:
        yield span
    except Exception as e:
        tracer.add_log('error', f"Context failed: {str(e)}")
        raise
    finally:
        tracer.finish_span(span)

# Middleware integration
class TracingMiddleware:
    """Middleware for automatic HTTP request tracing."""
    
    def __init__(self, app, tracer: DistributedTracer = None):
        self.app = app
        self.tracer = tracer or get_tracer()
    
    def __call__(self, environ, start_response):
        """WSGI application with tracing."""
        if not self.tracer.enabled:
            return self.app(environ, start_response)
        
        # Extract trace headers
        headers = self._extract_headers(environ)
        
        # Continue or start trace
        span = self.tracer.continue_trace(headers)
        if not span:
            span = self.tracer.start_trace(
                f"{environ.get('REQUEST_METHOD', 'GET')} {environ.get('PATH_INFO', '/')}",
                resource="http"
            )
        
        # Add request tags
        self.tracer.add_tag('http.method', environ.get('REQUEST_METHOD'))
        self.tracer.add_tag('http.url', environ.get('PATH_INFO'))
        self.tracer.add_tag('http.user_agent', environ.get('HTTP_USER_AGENT'))
        self.tracer.add_tag('http.remote_addr', environ.get('REMOTE_ADDR'))
        
        # Capture response
        response = {}
        def custom_start_response(status, headers, exc_info=None):
            response['status'] = status
            response['headers'] = headers
            return start_response(status, headers, exc_info)
        
        try:
            # Call application
            app_iter = self.app(environ, custom_start_response)
            
            # Add response tags
            if response.get('status'):
                status_code = int(response['status'].split()[0])
                self.tracer.add_tag('http.status_code', status_code)
                
                if status_code >= 400:
                    span.status = "error"
                    self.tracer.add_log('error', f"HTTP {status_code}")
            
            return app_iter
            
        except Exception as e:
            self.tracer.add_log('error', f"Request failed: {str(e)}")
            span.status = "error"
            raise
        finally:
            self.tracer.finish_span(span)
    
    def _extract_headers(self, environ: Dict[str, str]) -> Dict[str, str]:
        """Extract HTTP headers from WSGI environ."""
        headers = {}
        
        # Extract trace headers
        for key, value in environ.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].replace('_', '-').title()
                headers[header_name] = value
        
        return headers

# Export utilities
__all__ = [
    'DistributedTracer',
    'get_tracer',
    'trace',
    'trace_async',
    'trace_context',
    'TracingMiddleware'
]
