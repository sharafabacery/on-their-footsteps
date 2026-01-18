"""
Performance testing suite for API endpoints.
Tests response times, throughput, and resource usage.
"""

import pytest
import asyncio
import time
import psutil
import requests
from typing import Dict, List, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.query_optimizer import QueryOptimizer
from app.utils.rate_limiter import get_rate_limiter
from app.config import settings
import statistics

class PerformanceTestSuite:
    """Comprehensive performance testing suite."""
    
    def __init__(self):
        self.base_url = settings.API_BASE_URL or "http://localhost:8000"
        self.results = []
        self.thresholds = {
            "response_time_ms": 500,  # 500ms max
            "throughput_rps": 100,    # 100 requests per second
            "memory_usage_mb": 512,    # 512MB max
            "cpu_usage_percent": 80,   # 80% max
            "error_rate_percent": 1     # 1% max error rate
        }
    
    async def run_all_tests(self):
        """Run all performance tests."""
        print("🚀 Starting Performance Test Suite")
        print("=" * 50)
        
        test_methods = [
            self.test_api_response_times,
            self.test_concurrent_requests,
            self.test_database_performance,
            self.test_memory_usage,
            self.test_cpu_usage,
            self.test_rate_limiting_performance,
            self.test_cache_performance,
            self.test_query_optimizer_performance,
            self.test_endurance_load,
            self.test_stress_load
        ]
        
        for test_method in test_methods:
            try:
                print(f"\n📊 Running {test_method.__name__}...")
                await test_method()
                print(f"✅ {test_method.__name__} completed")
            except Exception as e:
                print(f"❌ {test_method.__name__} failed: {e}")
        
        self.generate_report()
    
    async def test_api_response_times(self):
        """Test API endpoint response times."""
        endpoints = [
            "/api/characters",
            "/api/characters/1",
            "/api/content/categories",
            "/api/stats",
            "/api/health"
        ]
        
        for endpoint in endpoints:
            times = []
            
            # Make 10 requests to each endpoint
            for _ in range(10):
                start_time = time.time()
                try:
                    response = requests.get(f"{self.base_url}{endpoint}")
                    end_time = time.time()
                    
                    if response.status_code == 200:
                        times.append((end_time - start_time) * 1000)  # Convert to ms
                except Exception as e:
                    print(f"  ❌ Request failed for {endpoint}: {e}")
                    continue
            
            if times:
                avg_time = statistics.mean(times)
                p95_time = statistics.quantiles(times, n=20)[18]  # 95th percentile
                max_time = max(times)
                
                result = {
                    "test": "api_response_times",
                    "endpoint": endpoint,
                    "avg_time_ms": round(avg_time, 2),
                    "p95_time_ms": round(p95_time, 2),
                    "max_time_ms": round(max_time, 2),
                    "requests": len(times),
                    "passed": avg_time <= self.thresholds["response_time_ms"]
                }
                
                self.results.append(result)
                print(f"  📈 {endpoint}: avg={avg_time:.2f}ms, p95={p95_time:.2f}ms, max={max_time:.2f}ms")
    
    async def test_concurrent_requests(self):
        """Test API performance under concurrent load."""
        endpoint = "/api/characters"
        concurrent_users = 10
        requests_per_user = 20
        
        def make_requests(user_id):
            times = []
            errors = 0
            
            for i in range(requests_per_user):
                start_time = time.time()
                try:
                    response = requests.get(f"{self.base_url}{endpoint}")
                    end_time = time.time()
                    
                    if response.status_code == 200:
                        times.append((end_time - start_time) * 1000)
                    else:
                        errors += 1
                except Exception:
                    errors += 1
            
            return {
                "user_id": user_id,
                "times": times,
                "errors": errors,
                "total_requests": requests_per_user
            }
        
        # Run concurrent requests
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_requests, i) for i in range(concurrent_users)]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        
        # Calculate aggregate metrics
        all_times = []
        total_errors = 0
        total_requests = 0
        
        for result in results:
            all_times.extend(result["times"])
            total_errors += result["errors"]
            total_requests += result["total_requests"]
        
        if all_times:
            avg_time = statistics.mean(all_times)
            throughput = total_requests / (end_time - start_time)
            error_rate = (total_errors / total_requests) * 100
            
            result = {
                "test": "concurrent_requests",
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate_percent": round(error_rate, 2),
                "avg_time_ms": round(avg_time, 2),
                "throughput_rps": round(throughput, 2),
                "duration_s": round(end_time - start_time, 2),
                "passed": (
                    avg_time <= self.thresholds["response_time_ms"] and
                    throughput >= self.thresholds["throughput_rps"] and
                    error_rate <= self.thresholds["error_rate_percent"]
                )
            }
            
            self.results.append(result)
            print(f"  📊 Concurrent: {concurrent_users} users, {throughput:.2f} RPS, {error_rate:.2f}% errors")
    
    async def test_database_performance(self):
        """Test database query performance."""
        db = next(get_db())
        
        try:
            # Test optimized queries
            start_time = time.time()
            
            # Test character list query
            characters = QueryOptimizer.get_characters_with_relations(
                db=db,
                page=1,
                limit=50,
                category="الصحابة",
                sort="views"
            )
            
            end_time = time.time()
            query_time = (end_time - start_time) * 1000
            
            # Test single character query
            start_time = time.time()
            
            character = QueryOptimizer.get_character_by_id_optimized(db, 1)
            
            end_time = time.time()
            single_query_time = (end_time - start_time) * 1000
            
            # Test search query
            start_time = time.time()
            
            search_results = QueryOptimizer.search_characters_optimized(
                db=db,
                query="محمد",
                limit=20
            )
            
            end_time = time.time()
            search_time = (end_time - start_time) * 1000
            
            result = {
                "test": "database_performance",
                "list_query_ms": round(query_time, 2),
                "single_query_ms": round(single_query_time, 2),
                "search_query_ms": round(search_time, 2),
                "characters_returned": len(characters),
                "search_results": len(search_results),
                "passed": (
                    query_time <= 100 and
                    single_query_time <= 50 and
                    search_time <= 200
                )
            }
            
            self.results.append(result)
            print(f"  🗄️ DB: list={query_time:.2f}ms, single={single_query_time:.2f}ms, search={search_time:.2f}ms")
            
        finally:
            db.close()
    
    async def test_memory_usage(self):
        """Test memory usage during operations."""
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform memory-intensive operations
        characters = []
        
        for i in range(100):
            try:
                response = requests.get(f"{self.base_url}/api/characters?limit=100")
                if response.status_code == 200:
                    characters.extend(response.json())
            except Exception as e:
                print(f"  ❌ Memory test request {i} failed: {e}")
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_used = final_memory - initial_memory
        
        result = {
            "test": "memory_usage",
            "initial_memory_mb": round(initial_memory, 2),
            "final_memory_mb": round(final_memory, 2),
            "memory_used_mb": round(memory_used, 2),
            "characters_loaded": len(characters),
            "passed": memory_used <= self.thresholds["memory_usage_mb"]
        }
        
        self.results.append(result)
        print(f"  💾 Memory: {memory_used:.2f}MB used, {len(characters)} characters loaded")
    
    async def test_cpu_usage(self):
        """Test CPU usage during operations."""
        process = psutil.Process()
        
        # Get baseline CPU usage
        initial_cpu = process.cpu_percent(interval=1)
        
        # Perform CPU-intensive operations
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            
            # Make concurrent requests
            for i in range(50):
                future = executor.submit(requests.get, f"{self.base_url}/api/characters")
                futures.append(future)
            
            # Wait for all requests to complete
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception:
                    pass
        
        end_time = time.time()
        
        # Get peak CPU usage
        peak_cpu = process.cpu_percent(interval=1)
        
        result = {
            "test": "cpu_usage",
            "initial_cpu_percent": initial_cpu,
            "peak_cpu_percent": peak_cpu,
            "duration_s": round(end_time - start_time, 2),
            "requests_completed": 50,
            "passed": peak_cpu <= self.thresholds["cpu_usage_percent"]
        }
        
        self.results.append(result)
        print(f"  ⚙️ CPU: {peak_cpu}% peak, {end_time - start_time:.2f}s duration")
    
    async def test_rate_limiting_performance(self):
        """Test rate limiting performance impact."""
        rate_limiter = get_rate_limiter()
        
        if not rate_limiter:
            print("  ⚠️ Rate limiting not available")
            return
        
        # Test rate limiting overhead
        endpoint = "/api/characters"
        
        # Test without rate limiting (simulate)
        start_time = time.time()
        
        for i in range(10):
            try:
                response = requests.get(f"{self.base_url}{endpoint}")
                if response.status_code == 429:
                    break
            except Exception:
                pass
        
        end_time = time.time()
        time_with_rate_limiting = end_time - start_time
        
        result = {
            "test": "rate_limiting_performance",
            "time_with_rate_limiting_s": round(time_with_rate_limiting, 3),
            "requests_made": 10,
            "passed": time_with_rate_limiting < 5.0  # Should be fast
        }
        
        self.results.append(result)
        print(f"  🚦 Rate limiting: {time_with_rate_limiting:.3f}s for 10 requests")
    
    async def test_cache_performance(self):
        """Test cache performance."""
        endpoint = "/api/characters"
        
        # First request (cache miss)
        start_time = time.time()
        try:
            response1 = requests.get(f"{self.base_url}{endpoint}")
            first_request_time = (time.time() - start_time) * 1000
        except Exception as e:
            print(f"  ❌ First request failed: {e}")
            return
        
        # Second request (cache hit)
        start_time = time.time()
        try:
            response2 = requests.get(f"{self.base_url}{endpoint}")
            second_request_time = (time.time() - start_time) * 1000
        except Exception as e:
            print(f"  ❌ Second request failed: {e}")
            return
        
        cache_improvement = ((first_request_time - second_request_time) / first_request_time) * 100
        
        result = {
            "test": "cache_performance",
            "first_request_ms": round(first_request_time, 2),
            "second_request_ms": round(second_request_time, 2),
            "cache_improvement_percent": round(cache_improvement, 2),
            "passed": cache_improvement > 20  # Should be at least 20% faster
        }
        
        self.results.append(result)
        print(f"  🗄️ Cache: {cache_improvement:.2f}% improvement")
    
    async def test_query_optimizer_performance(self):
        """Test query optimizer performance."""
        db = next(get_db())
        
        try:
            # Test optimized vs unoptimized queries
            # Optimized query
            start_time = time.time()
            optimized_results = QueryOptimizer.get_characters_with_relations(
                db=db,
                page=1,
                limit=100,
                category="الصحابة"
            )
            optimized_time = (time.time() - start_time) * 1000
            
            # Simulate unoptimized query (basic query)
            start_time = time.time()
            from app.models import IslamicCharacter
            unoptimized_results = db.query(IslamicCharacter).filter(
                IslamicCharacter.category == "الصحابة"
            ).limit(100).all()
            unoptimized_time = (time.time() - start_time) * 1000
            
            improvement = ((unoptimized_time - optimized_time) / unoptimized_time) * 100
            
            result = {
                "test": "query_optimizer_performance",
                "optimized_time_ms": round(optimized_time, 2),
                "unoptimized_time_ms": round(unoptimized_time, 2),
                "improvement_percent": round(improvement, 2),
                "optimized_count": len(optimized_results),
                "unoptimized_count": len(unoptimized_results),
                "passed": improvement > 10  # Should be at least 10% faster
            }
            
            self.results.append(result)
            print(f"  🔧 Query optimizer: {improvement:.2f}% improvement")
            
        finally:
            db.close()
    
    async def test_endurance_load(self):
        """Test system under sustained load."""
        duration = 30  # 30 seconds
        requests_per_second = 10
        endpoint = "/api/health"  # Use health endpoint for endurance test
        
        start_time = time.time()
        end_time = start_time + duration
        request_count = 0
        error_count = 0
        
        while time.time() < end_time:
            batch_start = time.time()
            batch_end = batch_start + 1.0  # 1 second batches
            
            # Make requests for 1 second
            while time.time() < batch_end:
                try:
                    response = requests.get(f"{self.base_url}{endpoint}")
                    request_count += 1
                    if response.status_code != 200:
                        error_count += 1
                except Exception:
                    error_count += 1
                
                # Small delay to control rate
                await asyncio.sleep(0.1)
        
        actual_duration = time.time() - start_time
        actual_rps = request_count / actual_duration
        error_rate = (error_count / request_count) * 100
        
        result = {
            "test": "endurance_load",
            "duration_s": round(actual_duration, 2),
            "requests_made": request_count,
            "errors": error_count,
            "error_rate_percent": round(error_rate, 2),
            "actual_rps": round(actual_rps, 2),
            "target_rps": requests_per_second,
            "passed": error_rate <= 1.0  # Less than 1% errors
        }
        
        self.results.append(result)
        print(f"  🏃️ Endurance: {actual_rps:.2f} RPS for {actual_duration:.2f}s")
    
    async def test_stress_load(self):
        """Test system under maximum load."""
        max_concurrent = 50
        requests_per_thread = 5
        endpoint = "/api/characters"
        
        def stress_test():
            times = []
            errors = 0
            
            for i in range(requests_per_thread):
                start_time = time.time()
                try:
                    response = requests.get(f"{self.base_url}{endpoint}")
                    end_time = time.time()
                    
                    if response.status_code == 200:
                        times.append((end_time - start_time) * 1000)
                    else:
                        errors += 1
                except Exception:
                    errors += 1
            
            return {
                "times": times,
                "errors": errors,
                "requests": requests_per_thread
            }
        
        # Run stress test
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
            futures = [executor.submit(stress_test) for _ in range(max_concurrent)]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        
        # Calculate aggregate metrics
        all_times = []
        total_errors = 0
        total_requests = 0
        
        for result in results:
            all_times.extend(result["times"])
            total_errors += result["errors"]
            total_requests += result["requests"]
        
        if all_times:
            avg_time = statistics.mean(all_times)
            throughput = total_requests / (end_time - start_time)
            error_rate = (total_errors / total_requests) * 100
            
            result = {
                "test": "stress_load",
                "max_concurrent": max_concurrent,
                "requests_per_thread": requests_per_thread,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate_percent": round(error_rate, 2),
                "avg_time_ms": round(avg_time, 2),
                "throughput_rps": round(throughput, 2),
                "duration_s": round(end_time - start_time, 2),
                "passed": error_rate <= 5.0  # Allow up to 5% errors under stress
            }
            
            self.results.append(result)
            print(f"  🔥 Stress: {max_concurrent} concurrent, {throughput:.2f} RPS, {error_rate:.2f}% errors")
    
    def generate_report(self):
        """Generate comprehensive performance report."""
        print("\n" + "=" * 50)
        print("📊 PERFORMANCE TEST REPORT")
        print("=" * 50)
        
        passed_tests = sum(1 for result in self.results if result.get("passed", False))
        total_tests = len(self.results)
        
        print(f"\n📈 Overall Results:")
        print(f"   Tests Passed: {passed_tests}/{total_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print(f"\n📋 Test Results:")
        for result in self.results:
            status = "✅ PASS" if result.get("passed", False) else "❌ FAIL"
            print(f"   {status} {result['test']}")
            
            # Show key metrics
            if "avg_time_ms" in result:
                print(f"      Avg Time: {result['avg_time_ms']}ms")
            if "throughput_rps" in result:
                print(f"      Throughput: {result['throughput_rps']} RPS")
            if "error_rate_percent" in result:
                print(f"      Error Rate: {result['error_rate_percent']}%")
        
        # Performance recommendations
        print(f"\n💡 Recommendations:")
        
        failed_tests = [r for r in self.results if not r.get("passed", False)]
        
        if failed_tests:
            for test in failed_tests:
                if test["test"] == "api_response_times":
                    print("   - Optimize slow API endpoints")
                elif test["test"] == "concurrent_requests":
                    print("   - Increase server resources or optimize database queries")
                elif test["test"] == "memory_usage":
                    print("   - Implement memory-efficient data structures")
                elif test["test"] == "cpu_usage":
                    print("   - Optimize algorithms and reduce computational complexity")
                elif test["test"] == "cache_performance":
                    print("   - Implement better caching strategies")
                elif test["test"] == "query_optimizer_performance":
                    print("   - Add more database indexes")
                elif test["test"] == "endurance_load":
                    print("   - Implement connection pooling and load balancing")
        else:
            print("   - All performance tests passed! System is performing well.")
        
        # Export results to file
        import json
        with open("performance_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: performance_test_results.json")


# Test runner
async def run_performance_tests():
    """Run all performance tests."""
    suite = PerformanceTestSuite()
    await suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(run_performance_tests())
